"""
Face verification: a reference photo is captured when the exam starts and every
later camera snapshot is compared against it, so a swap of the person at the
keyboard shows up for the trainer.

Models: InsightFace "buffalo_sc" pack run directly on onnxruntime —
  det_500m.onnx   SCRFD face detector (boxes + 5 landmarks)
  w600k_mbf.onnx  MobileFaceNet / ArcFace embedder (512-d)
The `insightface` wheel itself is not used because it has no Windows wheel and
needs a C++ compiler; only these two ONNX files are needed.

Everything here is deterministic CPU numpy/onnx; nothing leaves the server.
"""
import logging
import os
import threading
import urllib.request
import zipfile
from dataclasses import dataclass, field
from typing import List, Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

MODEL_DIR = os.environ.get(
    "FACE_MODEL_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "face_models"),
)
MODEL_PACK_URL = os.environ.get(
    "FACE_MODEL_URL",
    "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_sc.zip",
)
DET_MODEL = "det_500m.onnx"
REC_MODEL = "w600k_mbf.onnx"


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


def is_enabled() -> bool:
    return os.environ.get("FACE_VERIFICATION_ENABLED", "1") != "0"


# Cosine similarity at/above which two faces are treated as the same person.
MATCH_THRESHOLD = _env_float("FACE_MATCH_THRESHOLD", 0.35)
# Consecutive mismatching checks before a FACE_MISMATCH flag is raised.
MISMATCH_RUN_TO_FLAG = _env_int("FACE_MISMATCH_RUN", 2)
CHECK_INTERVAL_SECONDS = _env_int("FACE_CHECK_INTERVAL_SECONDS", 20)
# Keep the snapshot of every Nth matching check as context (mismatches always kept).
KEEP_EVERY_NTH_MATCH = _env_int("FACE_KEEP_EVERY_NTH_MATCH", 5)
IMAGE_RETENTION_DAYS = _env_int("FACE_IMAGE_RETENTION_DAYS", 30)

MAX_IMAGE_BYTES = 3 * 1024 * 1024
MAX_IMAGE_SIDE = 1280

# --- reference-photo quality limits (tuned on webcam-sized frames) ---
MIN_FACE_SIDE_PX = 90           # shortest side of the face box, in the (resized) image
MIN_FACE_WIDTH_RATIO = 0.15     # face width / image width
MAX_CENTER_X_OFFSET = 0.14      # face-centre offset from image centre, as a fraction of image width
MAX_CENTER_Y_OFFSET = 0.18      # ... and of image height (the guide oval sits just above middle)
MIN_FACE_HEIGHT_RATIO = 0.30    # face-box height / image height: below this, "move closer"
MAX_FACE_HEIGHT_RATIO = 0.80    # above this, "move back"
MIN_BRIGHTNESS = 55             # mean luma of the face crop (0-255)
MAX_BRIGHTNESS = 215
MIN_SHARPNESS = _env_float("FACE_MIN_SHARPNESS", 25.0)   # variance of Laplacian on the 112px face crop
MAX_YAW_RATIO = 0.40            # |nose offset from eye-midpoint| / eye distance
MAX_ROLL_DEG = 25.0
MIN_DETECTION_SCORE = 0.6
SECOND_FACE_MIN_SCORE = 0.6
SECOND_FACE_MIN_AREA_RATIO = 0.25   # vs. the main face; ignores tiny background faces/posters

# Human-readable text for each rejection reason, shown to the trainee.
REASON_MESSAGES = {
    "invalid_image": "The photo could not be read. Please try again.",
    "no_face": "No face found. Look straight at the camera.",
    "multiple_faces": "More than one person is in the frame. Only the candidate should be visible.",
    "face_too_small": "Move closer to the camera.",
    "face_too_close": "Move back a little from the camera.",
    "face_not_centered": "Center your face in the frame.",
    "too_dark": "The image is too dark. Face a light source.",
    "too_bright": "The image is too bright. Reduce the light behind or on your face.",
    "blurry": "The image is blurry. Hold still and make sure the camera is clean.",
    "face_not_frontal": "Look straight at the camera.",
    "face_tilted": "Keep your head level.",
}


class FaceModelUnavailable(RuntimeError):
    """The ONNX models are missing and could not be downloaded."""


@dataclass
class DetectedFace:
    bbox: np.ndarray          # x1, y1, x2, y2 in image pixels
    score: float
    kps: np.ndarray           # 5x2: left eye, right eye, nose, left mouth, right mouth

    @property
    def width(self) -> float:
        return float(self.bbox[2] - self.bbox[0])

    @property
    def height(self) -> float:
        return float(self.bbox[3] - self.bbox[1])

    @property
    def area(self) -> float:
        return self.width * self.height


@dataclass
class QualityResult:
    ok: bool
    reasons: List[str] = field(default_factory=list)
    face: Optional[DetectedFace] = None
    face_count: int = 0
    # One entry per condition the candidate can act on, in the order to fix them:
    # {"id", "label", "ok", "message"}. Empty when no face was found.
    checks: List[dict] = field(default_factory=list)
    # Normalised (0-1) image coordinates for drawing the live guide.
    box: Optional[List[float]] = None
    eyes: Optional[List[List[float]]] = None

    @property
    def messages(self) -> List[str]:
        return [REASON_MESSAGES.get(r, r) for r in self.reasons]


# ---------------------------------------------------------------- model loading

_engine_lock = threading.Lock()
_engine = None


def ensure_models() -> None:
    """Download the model pack once if the two ONNX files are not on disk."""
    det, rec = os.path.join(MODEL_DIR, DET_MODEL), os.path.join(MODEL_DIR, REC_MODEL)
    if os.path.exists(det) and os.path.exists(rec):
        return
    os.makedirs(MODEL_DIR, exist_ok=True)
    zip_path = os.path.join(MODEL_DIR, "pack.zip")
    try:
        logger.info("Downloading face models from %s", MODEL_PACK_URL)
        urllib.request.urlretrieve(MODEL_PACK_URL, zip_path)
        with zipfile.ZipFile(zip_path) as zf:
            for name in (DET_MODEL, REC_MODEL):
                with zf.open(name) as src, open(os.path.join(MODEL_DIR, name), "wb") as dst:
                    dst.write(src.read())
    except Exception as e:  # noqa: BLE001 — network/zip errors all mean "unavailable"
        raise FaceModelUnavailable(
            f"Face models are missing from {MODEL_DIR} and could not be downloaded: {e}"
        ) from e
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)


class FaceEngine:
    # ArcFace 112x112 alignment template (left eye, right eye, nose, left mouth, right mouth)
    _ARCFACE_DST = np.array(
        [[38.2946, 51.6963], [73.5318, 51.5014], [56.0252, 71.7366],
         [41.5493, 92.3655], [70.7299, 92.2041]], dtype=np.float32,
    )
    _STRIDES = (8, 16, 32)
    _NUM_ANCHORS = 2

    def __init__(self, model_dir: str = MODEL_DIR):
        import onnxruntime as ort

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = _env_int("FACE_ORT_THREADS", 2)
        providers = ["CPUExecutionProvider"]
        self._det = ort.InferenceSession(os.path.join(model_dir, DET_MODEL), opts, providers=providers)
        self._rec = ort.InferenceSession(os.path.join(model_dir, REC_MODEL), opts, providers=providers)
        self._det_input = self._det.get_inputs()[0].name
        self._rec_input = self._rec.get_inputs()[0].name
        self._det_size = (640, 640)
        self._anchor_cache: dict = {}

    # -- detection (SCRFD) --------------------------------------------------

    def _anchors(self, h: int, w: int, stride: int) -> np.ndarray:
        key = (h, w, stride)
        if key not in self._anchor_cache:
            grid = np.stack(np.mgrid[:h, :w][::-1], axis=-1).astype(np.float32)
            centers = (grid * stride).reshape(-1, 2)
            self._anchor_cache[key] = np.repeat(centers, self._NUM_ANCHORS, axis=0)
        return self._anchor_cache[key]

    def detect(self, bgr: np.ndarray, threshold: float = 0.5) -> List[DetectedFace]:
        in_w, in_h = self._det_size
        img_h, img_w = bgr.shape[:2]
        if img_h / img_w > in_h / in_w:
            new_h, new_w = in_h, max(1, int(in_h / (img_h / img_w)))
        else:
            new_w, new_h = in_w, max(1, int(in_w * (img_h / img_w)))
        scale = new_h / img_h

        canvas = np.zeros((in_h, in_w, 3), dtype=np.uint8)
        canvas[:new_h, :new_w] = cv2.resize(bgr, (new_w, new_h))
        blob = (canvas[:, :, ::-1].astype(np.float32) - 127.5) / 128.0
        blob = blob.transpose(2, 0, 1)[None]
        outs = self._det.run(None, {self._det_input: blob})

        fmc = len(self._STRIDES)
        boxes, scores_all, kps_all = [], [], []
        for idx, stride in enumerate(self._STRIDES):
            scores = outs[idx].reshape(-1)
            bbox_pred = outs[idx + fmc].reshape(-1, 4) * stride
            kps_pred = outs[idx + fmc * 2].reshape(-1, 10) * stride
            centers = self._anchors(in_h // stride, in_w // stride, stride)
            keep = np.where(scores >= threshold)[0]
            if keep.size == 0:
                continue
            c, bp, kp = centers[keep], bbox_pred[keep], kps_pred[keep]
            boxes.append(np.stack([c[:, 0] - bp[:, 0], c[:, 1] - bp[:, 1],
                                   c[:, 0] + bp[:, 2], c[:, 1] + bp[:, 3]], axis=1))
            kps_all.append(np.stack([np.stack([c[:, 0] + kp[:, 2 * i], c[:, 1] + kp[:, 2 * i + 1]], axis=1)
                                     for i in range(5)], axis=1))
            scores_all.append(scores[keep])
        if not boxes:
            return []

        boxes = np.concatenate(boxes) / scale
        kps = np.concatenate(kps_all) / scale
        scores = np.concatenate(scores_all)
        return [
            DetectedFace(bbox=boxes[i], score=float(scores[i]), kps=kps[i])
            for i in self._nms(boxes, scores, 0.4)
        ]

    @staticmethod
    def _nms(boxes: np.ndarray, scores: np.ndarray, iou_thresh: float) -> List[int]:
        x1, y1, x2, y2 = boxes.T
        areas = (x2 - x1 + 1) * (y2 - y1 + 1)
        order = scores.argsort()[::-1]
        keep: List[int] = []
        while order.size:
            i = order[0]
            keep.append(int(i))
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])
            inter = np.maximum(0.0, xx2 - xx1 + 1) * np.maximum(0.0, yy2 - yy1 + 1)
            iou = inter / (areas[i] + areas[order[1:]] - inter)
            order = order[1:][iou <= iou_thresh]
        return keep

    # -- embedding (ArcFace) -------------------------------------------------

    @classmethod
    def _align(cls, bgr: np.ndarray, kps: np.ndarray) -> np.ndarray:
        """Warp the face to the 112x112 ArcFace template (similarity transform)."""
        matrix = _umeyama(kps.astype(np.float32), cls._ARCFACE_DST)
        return cv2.warpAffine(bgr, matrix, (112, 112), borderValue=0.0)

    def embed(self, bgr: np.ndarray, face: DetectedFace) -> np.ndarray:
        aligned = self._align(bgr, face.kps)
        blob = (aligned[:, :, ::-1].astype(np.float32) - 127.5) / 127.5
        blob = blob.transpose(2, 0, 1)[None]
        vec = self._rec.run(None, {self._rec_input: blob})[0].reshape(-1).astype(np.float32)
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def aligned_crop(self, bgr: np.ndarray, face: DetectedFace) -> np.ndarray:
        return self._align(bgr, face.kps)


def _umeyama(src: np.ndarray, dst: np.ndarray) -> np.ndarray:
    """2x3 similarity transform (scale+rotation+translation) mapping src -> dst."""
    n = src.shape[0]
    src_mean, dst_mean = src.mean(axis=0), dst.mean(axis=0)
    src_c, dst_c = src - src_mean, dst - dst_mean
    cov = dst_c.T @ src_c / n
    u, s, vt = np.linalg.svd(cov)
    d = np.ones(2)
    if np.linalg.det(cov) < 0:
        d[-1] = -1
    rot = u @ np.diag(d) @ vt
    var = (src_c ** 2).sum() / n
    scale = (s * d).sum() / var
    trans = dst_mean - scale * rot @ src_mean
    return np.hstack([scale * rot, trans[:, None]]).astype(np.float32)


def get_engine() -> FaceEngine:
    global _engine
    if _engine is None:
        with _engine_lock:
            if _engine is None:
                ensure_models()
                _engine = FaceEngine()
    return _engine


# ---------------------------------------------------------------- public API

def decode_image(data: bytes) -> Optional[np.ndarray]:
    """Decode JPEG/PNG/WebP bytes to a BGR array, downscaling very large frames."""
    if not data or len(data) > MAX_IMAGE_BYTES:
        return None
    img = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None or img.size == 0:
        return None
    h, w = img.shape[:2]
    longest = max(h, w)
    if longest > MAX_IMAGE_SIDE:
        ratio = MAX_IMAGE_SIDE / longest
        img = cv2.resize(img, (int(w * ratio), int(h * ratio)), interpolation=cv2.INTER_AREA)
    return img


# Which conditions the candidate sees, and which rejection reasons belong to each.
QUALITY_CHECKS = [
    ("single_person", "One person", ("multiple_faces",)),
    ("distance", "Distance", ("face_too_small", "face_too_close")),
    ("position", "Position", ("face_not_centered",)),
    ("lighting", "Lighting", ("too_dark", "too_bright")),
    ("focus", "Focus", ("blurry",)),
    ("facing", "Facing camera", ("face_not_frontal", "face_tilted")),
]


def assess_quality(img: np.ndarray, engine: Optional[FaceEngine] = None) -> QualityResult:
    """Decide whether `img` is usable as the reference photo, and say what to fix if not."""
    engine = engine or get_engine()
    faces = [f for f in engine.detect(img) if f.score >= MIN_DETECTION_SCORE]
    if not faces:
        return QualityResult(ok=False, reasons=["no_face"])
    faces.sort(key=lambda f: f.area, reverse=True)
    main = faces[0]
    reasons: List[str] = []

    if any(f.score >= SECOND_FACE_MIN_SCORE and f.area >= main.area * SECOND_FACE_MIN_AREA_RATIO for f in faces[1:]):
        reasons.append("multiple_faces")

    img_h, img_w = img.shape[:2]
    face_h_ratio = main.height / img_h
    if (min(main.width, main.height) < MIN_FACE_SIDE_PX or main.width / img_w < MIN_FACE_WIDTH_RATIO
            or face_h_ratio < MIN_FACE_HEIGHT_RATIO):
        reasons.append("face_too_small")
    elif face_h_ratio > MAX_FACE_HEIGHT_RATIO:
        reasons.append("face_too_close")

    cx, cy = (main.bbox[0] + main.bbox[2]) / 2, (main.bbox[1] + main.bbox[3]) / 2
    if abs(cx - img_w / 2) / img_w > MAX_CENTER_X_OFFSET or abs(cy - img_h / 2) / img_h > MAX_CENTER_Y_OFFSET:
        reasons.append("face_not_centered")

    crop = engine.aligned_crop(img, main)
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    brightness = float(gray.mean())
    if brightness < MIN_BRIGHTNESS:
        reasons.append("too_dark")
    elif brightness > MAX_BRIGHTNESS:
        reasons.append("too_bright")
    if float(cv2.Laplacian(gray, cv2.CV_64F).var()) < MIN_SHARPNESS:
        reasons.append("blurry")

    left_eye, right_eye, nose = main.kps[0], main.kps[1], main.kps[2]
    eye_dist = float(np.linalg.norm(right_eye - left_eye))
    if eye_dist > 1:
        yaw_ratio = abs(float(nose[0] - (left_eye[0] + right_eye[0]) / 2)) / eye_dist
        if yaw_ratio > MAX_YAW_RATIO:
            reasons.append("face_not_frontal")
        roll = abs(float(np.degrees(np.arctan2(right_eye[1] - left_eye[1], right_eye[0] - left_eye[0]))))
        if roll > MAX_ROLL_DEG:
            reasons.append("face_tilted")

    checks = []
    for check_id, label, owned in QUALITY_CHECKS:
        failed = next((r for r in reasons if r in owned), None)
        checks.append({"id": check_id, "label": label, "ok": failed is None,
                       "message": REASON_MESSAGES[failed] if failed else None})

    x1, y1, x2, y2 = main.bbox
    return QualityResult(
        ok=not reasons,
        reasons=reasons,
        face=main,
        face_count=len(faces),
        checks=checks,
        box=[float(x1 / img_w), float(y1 / img_h), float(x2 / img_w), float(y2 / img_h)],
        eyes=[[float(left_eye[0] / img_w), float(left_eye[1] / img_h)],
              [float(right_eye[0] / img_w), float(right_eye[1] / img_h)]],
    )


def extract_embedding(img: np.ndarray, engine: Optional[FaceEngine] = None) -> Optional[np.ndarray]:
    """Embedding of the most prominent face, or None if there is none."""
    engine = engine or get_engine()
    faces = [f for f in engine.detect(img) if f.score >= MIN_DETECTION_SCORE]
    if not faces:
        return None
    return engine.embed(img, max(faces, key=lambda f: f.area))


@dataclass
class CheckResult:
    status: str                       # MATCH | MISMATCH | NO_FACE
    similarity: Optional[float] = None
    face_count: int = 0


def compare_to_reference(img: np.ndarray, reference: np.ndarray,
                         engine: Optional[FaceEngine] = None) -> CheckResult:
    """
    Compare every face in `img` with the reference and keep the best similarity.

    Best-of-all rather than largest-face: the question here is "is the
    registered person present", and an extra person in frame is already caught
    by the page's MULTIPLE_FACES detector, so counting it here would double-flag.
    """
    engine = engine or get_engine()
    faces = [f for f in engine.detect(img) if f.score >= MIN_DETECTION_SCORE]
    if not faces:
        return CheckResult(status="NO_FACE")
    ref = np.asarray(reference, dtype=np.float32)
    best = max(float(np.dot(engine.embed(img, f), ref)) for f in faces)
    status = "MATCH" if best >= MATCH_THRESHOLD else "MISMATCH"
    return CheckResult(status=status, similarity=best, face_count=len(faces))
