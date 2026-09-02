// Simple global store for non-serializable objects like MediaStream
export const globalState = {
  mediaStream: null
};

// Explicit mic constraints so STT gets browser-cleaned audio (echo/noise/gain)
// rather than whatever the platform default happens to be.
export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
