// The one place the exam's camera + microphone stream is opened and closed.
//
// Every caller used to open its own stream and stop it by hand, which leaked in a few ways:
// two overlapping requests (React StrictMode runs effects twice) left the first stream orphaned
// and live, a request that finished after its page unmounted was never stopped, and several exit
// paths never stopped anything. Here concurrent callers share one request, and releaseAllMedia()
// also discards a request that is still in flight, so nothing can outlive the exam.
import { globalState } from '@/store';

let generation = 0; // bumped on every release; a request from an older generation is discarded
let inflight = null;

const isLive = (stream) => !!stream && stream.getTracks().length > 0 && stream.getTracks().every((t) => t.readyState === 'live');

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Resolves with the shared exam stream, opening it if there isn't a live one yet.
 * Callers asking at the same time get the same stream (and a single permission prompt).
 * Rejects with an AbortError if releaseAllMedia() ran while the browser was still opening it.
 */
export function ensureExamStream(constraints) {
  if (isLive(globalState.mediaStream)) return Promise.resolve(globalState.mediaStream);
  if (inflight) return inflight;

  const requestedAt = generation;
  const request = navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      if (requestedAt !== generation) {
        stopStream(stream);
        throw new DOMException('The camera and microphone were released while they were being opened.', 'AbortError');
      }
      globalState.mediaStream = stream;
      return stream;
    })
    .finally(() => {
      // Only clear our own slot: after a release a newer request may already own it.
      if (inflight === request) inflight = null;
    });
  inflight = request;
  return request;
}

/** Turns the camera and microphone off for good: stops every track and drops any pending request. */
export function releaseAllMedia() {
  generation += 1;
  inflight = null;
  stopStream(globalState.mediaStream);
  globalState.mediaStream = null;
}
