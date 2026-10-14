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
