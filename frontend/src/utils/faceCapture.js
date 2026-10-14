// Grab the current camera frame as a JPEG blob for face verification.
// Downscaled so a snapshot is ~30-60 KB; the server only needs a face-sized crop.
// Not mirrored: stored snapshots must have the same orientation as the reference.
export async function captureFrameBlob(video, maxSide = 640, quality = 0.9) {
  if (!video || !video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality));
}

// Where a point given as 0-1 fractions of the camera frame lands inside a box
// that shows the video with object-fit: cover (and, optionally, mirrored the way
// the preview is). Returns fractions of the box, so the result can drive CSS
// left/top percentages; values outside 0-1 mean the point is cropped out of view.
export function mapToCoverBox([nx, ny], videoW, videoH, boxW, boxH, mirror = true) {
  const scale = Math.max(boxW / videoW, boxH / videoH);
  const fx = (nx * videoW * scale - (videoW * scale - boxW) / 2) / boxW;
  const fy = (ny * videoH * scale - (videoH * scale - boxH) / 2) / boxH;
  return { x: mirror ? 1 - fx : fx, y: fy };
}
