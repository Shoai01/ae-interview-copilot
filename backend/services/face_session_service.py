"""
Session-level face verification: stores the reference photo, runs the periodic
checks against it, and raises a FACE_MISMATCH fraud flag when the person in
front of the camera stops matching.

The ML itself lives in face_service; this module owns the DB rows and image files.
"""
import datetime
import logging
import os
from dataclasses import dataclass, field
from typing import List, Optional

import cv2
import numpy as np
from sqlalchemy.orm import Session

from models import domain
from models.domain import FraudFlagType, SessionStatus
from repositories import viva_repository
from services import face_service

logger = logging.getLogger(__name__)

FACE_UPLOAD_ROOT = os.path.join("uploads", "faces")
# Reject a check that arrives sooner than this after the previous one — the client
# paces itself at CHECK_INTERVAL_SECONDS, so anything faster is a bug or abuse.
MIN_SECONDS_BETWEEN_CHECKS = 10
JPEG_QUALITY = 88


class ReferenceAlreadySet(Exception):
    """The session's reference photo is locked once accepted."""


class ReferenceMissing(Exception):
    """A periodic check was sent before any reference photo was accepted."""


class SessionNotActive(Exception):
    pass


class CheckTooSoon(Exception):
    pass


@dataclass
class ReferenceOutcome:
    accepted: bool
    reasons: List[str] = field(default_factory=list)
    messages: List[str] = field(default_factory=list)


def _write_jpeg(img: np.ndarray, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    if not ok:
        raise ValueError("Could not encode image")
    with open(path, "wb") as f:
        f.write(buf.tobytes())


def _remove_file(path: Optional[str]) -> None:
    if path and os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            logger.warning("Could not delete face image %s", path)


def precheck(data: bytes) -> ReferenceOutcome:
    """Quality-check a candidate reference photo without touching any session."""
    img = face_service.decode_image(data)
    if img is None:
        return ReferenceOutcome(False, ["invalid_image"], [face_service.REASON_MESSAGES["invalid_image"]])
    quality = face_service.assess_quality(img)
    return ReferenceOutcome(quality.ok, quality.reasons, quality.messages)


def set_reference(db: Session, session: domain.VivaSession, data: bytes) -> ReferenceOutcome:
    """
    Validate and lock in the session's reference photo.

    Raises ReferenceAlreadySet if one was already accepted: re-enrolling mid-exam
    would let a stand-in replace the real candidate's reference.
    """
    if session.face_reference_embedding:
        raise ReferenceAlreadySet()
    if session.status != SessionStatus.IN_PROGRESS:
        raise SessionNotActive()

    img = face_service.decode_image(data)
    if img is None:
        return ReferenceOutcome(False, ["invalid_image"], [face_service.REASON_MESSAGES["invalid_image"]])

    engine = face_service.get_engine()
    quality = face_service.assess_quality(img, engine)
    if not quality.ok:
        return ReferenceOutcome(False, quality.reasons, quality.messages)

    embedding = engine.embed(img, quality.face)
    path = os.path.join(FACE_UPLOAD_ROOT, str(session.id), "reference.jpg")
    _write_jpeg(img, path)

    session.face_reference_path = path
    session.face_reference_embedding = [float(x) for x in embedding]
    session.face_reference_at = datetime.datetime.utcnow()
    viva_repository.save_session(db, session)
    return ReferenceOutcome(True)


def _consecutive_mismatches(checks: List[domain.FaceCheck]) -> int:
    """Length of the unbroken MISMATCH run at the head of `checks` (newest first)."""
    run = 0
    for c in checks:
        if c.status != "MISMATCH":
            break
        run += 1
    return run


def _open_mismatch_flag_question(db: Session, session_id: int) -> Optional[int]:
    """The viva_question_id holding a still-open FACE_MISMATCH episode, if any."""
    rows = (
        db.query(domain.FraudFlag)
        .join(domain.VivaQuestion, domain.FraudFlag.viva_question_id == domain.VivaQuestion.id)
        .filter(domain.VivaQuestion.session_id == session_id,
                domain.FraudFlag.flag_type == FraudFlagType.FACE_MISMATCH)
        .all()
    )
    for flag in rows:
        if any(e.get("end") is None for e in (flag.events or [])):
            return flag.viva_question_id
    return None


def run_check(db: Session, session: domain.VivaSession, data: bytes,
              viva_question_id: Optional[int]) -> str:
    """
    Compare one camera snapshot with the reference and record the result.

    Returns MATCH | MISMATCH | NO_FACE | INVALID. The trainee-facing route never
    exposes this, so a candidate can't tune their behaviour against the verdict.
    """
    if not session.face_reference_embedding:
        raise ReferenceMissing()
    if session.status != SessionStatus.IN_PROGRESS:
        raise SessionNotActive()

    now = datetime.datetime.utcnow()
    last = (
        db.query(domain.FaceCheck)
        .filter(domain.FaceCheck.session_id == session.id)
        .order_by(domain.FaceCheck.created_at.desc())
        .first()
    )
    if last and (now - last.created_at).total_seconds() < MIN_SECONDS_BETWEEN_CHECKS:
        raise CheckTooSoon()

    img = face_service.decode_image(data)
    if img is None:
        return "INVALID"

    if viva_question_id is not None and not viva_repository.get_viva_question(db, viva_question_id, session.id):
        viva_question_id = None

    result = face_service.compare_to_reference(img, np.asarray(session.face_reference_embedding, dtype=np.float32))

    keep_image = result.status == "MISMATCH"
    if result.status == "MATCH":
        matches_so_far = db.query(domain.FaceCheck).filter(
            domain.FaceCheck.session_id == session.id, domain.FaceCheck.status == "MATCH").count()
        keep_image = face_service.KEEP_EVERY_NTH_MATCH > 0 and matches_so_far % face_service.KEEP_EVERY_NTH_MATCH == 0

    check = domain.FaceCheck(
        session_id=session.id,
        viva_question_id=viva_question_id,
        status=result.status,
        similarity=result.similarity,
        face_count=result.face_count,
        created_at=now,
    )
    db.add(check)
    db.flush()
    if keep_image:
        path = os.path.join(FACE_UPLOAD_ROOT, str(session.id), f"check_{check.id}.jpg")
        _write_jpeg(img, path)
        check.image_path = path
    db.commit()

    if result.status != "NO_FACE":
        _update_mismatch_flag(db, session.id, check, viva_question_id)
    return result.status


def _update_mismatch_flag(db: Session, session_id: int, check: domain.FaceCheck,
                          viva_question_id: Optional[int]) -> None:
    """START an episode on the Nth consecutive mismatch; END it on the next match."""
    run_needed = face_service.MISMATCH_RUN_TO_FLAG
    recent = (
        db.query(domain.FaceCheck)
        .filter(domain.FaceCheck.session_id == session_id, domain.FaceCheck.status != "NO_FACE")
        .order_by(domain.FaceCheck.created_at.desc(), domain.FaceCheck.id.desc())
        .limit(run_needed + 1)
        .all()
    )
    at = check.created_at
    if check.status == "MISMATCH":
        if viva_question_id is not None and _consecutive_mismatches(recent) == run_needed:
            viva_repository.record_fraud_event(db, viva_question_id, FraudFlagType.FACE_MISMATCH, "START", at)
    else:
        # recent[0] is this MATCH; the run it interrupts starts at recent[1].
        if _consecutive_mismatches(recent[1:]) >= run_needed:
            open_q = _open_mismatch_flag_question(db, session_id)
            if open_q is not None:
                viva_repository.record_fraud_event(db, open_q, FraudFlagType.FACE_MISMATCH, "END", at)


def get_summary(db: Session, session_id: int) -> dict:
    """Everything the trainer review needs to judge identity for one session."""
    session = viva_repository.get_session_by_id(db, session_id)
    checks = (
        db.query(domain.FaceCheck)
        .filter(domain.FaceCheck.session_id == session_id)
        .order_by(domain.FaceCheck.created_at.asc())
        .all()
    )
    counts = {"MATCH": 0, "MISMATCH": 0, "NO_FACE": 0}
    for c in checks:
        counts[c.status] = counts.get(c.status, 0) + 1
    sims = [c.similarity for c in checks if c.similarity is not None]
    return {
        "enabled": face_service.is_enabled(),
        "reference_set": bool(session and session.face_reference_embedding),
        "reference_at": session.face_reference_at if session else None,
        "match_threshold": face_service.MATCH_THRESHOLD,
        "total_checks": len(checks),
        "matches": counts["MATCH"],
        "mismatches": counts["MISMATCH"],
        "no_face": counts["NO_FACE"],
        "min_similarity": min(sims) if sims else None,
        "checks": [
            {
                "id": c.id,
                "status": c.status,
                "similarity": c.similarity,
                "face_count": c.face_count,
                "viva_question_id": c.viva_question_id,
                "created_at": c.created_at,
                "has_image": bool(c.image_path and os.path.exists(c.image_path)),
            }
            for c in checks
        ],
    }


def purge_expired_images(db: Session, retention_days: Optional[int] = None) -> int:
    """Delete face images older than the retention window; keeps scores and flags."""
    days = face_service.IMAGE_RETENTION_DAYS if retention_days is None else retention_days
    if days <= 0:
        return 0
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    removed = 0
    for c in db.query(domain.FaceCheck).filter(
            domain.FaceCheck.created_at < cutoff, domain.FaceCheck.image_path.isnot(None)).all():
        _remove_file(c.image_path)
        c.image_path = None
        removed += 1
    for s in db.query(domain.VivaSession).filter(
            domain.VivaSession.face_reference_at < cutoff, domain.VivaSession.face_reference_path.isnot(None)).all():
        _remove_file(s.face_reference_path)
        s.face_reference_path = None
        removed += 1
    db.commit()
    return removed
