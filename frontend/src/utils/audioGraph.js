// Shared Web Audio graph for the mic track, session-long for the life of the
// exam page. useNoiseDetection (background-noise analyser) and
// useSpeechRecognition (PCM tap for Deepgram) both tap the same
// MediaStreamSource instead of each opening their own AudioContext.
import { globalState } from '@/store';

export const ANALYSER_FFT_SIZE = 256;

let audioContext = null;
let sourceNode = null;
let analyserNode = null;
let refCount = 0;
let workletModulePromise = null;

function createGraph() {
  const audioTracks = globalState.mediaStream.getAudioTracks();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioCtx();
  sourceNode = audioContext.createMediaStreamSource(new MediaStream([audioTracks[0]]));
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = ANALYSER_FFT_SIZE;
  sourceNode.connect(analyserNode);
  workletModulePromise = null;
}

/**
 * Acquires a reference to the shared audio graph, creating it on first use.
 * Every successful caller must eventually call releaseAudioGraph() exactly once.
 * Returns null if no mic stream is available.
 */
export function acquireAudioGraph() {
  if (!globalState.mediaStream) return null;
  if (globalState.mediaStream.getAudioTracks().length === 0) return null;

  if (!audioContext || audioContext.state === 'closed') {
    createGraph();
  }
  refCount += 1;
  return { audioContext, sourceNode, analyserNode };
}

/** Releases one reference; the graph is torn down once nobody holds it. */
export function releaseAudioGraph() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && audioContext) {
    const ctx = audioContext;
    audioContext = null;
    sourceNode = null;
    analyserNode = null;
    workletModulePromise = null;
    if (ctx.state !== 'closed') {
      ctx.close().catch(() => {});
    }
  }
}

/** Loads the PCM worklet module into the shared context (idempotent per context lifetime). */
export function loadPcmWorkletModule() {
  if (!audioContext) return Promise.reject(new Error('Audio graph not acquired'));
  if (!workletModulePromise) {
    workletModulePromise = audioContext.audioWorklet.addModule(`${import.meta.env.BASE_URL}pcm-processor.js`);
  }
  return workletModulePromise;
}
