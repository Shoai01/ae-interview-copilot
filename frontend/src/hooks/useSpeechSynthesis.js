import { useCallback, useRef } from 'react';
import { vivaService } from '@/services/api';

// Speaks interview questions using Deepgram TTS (backend-proxied, consistent
// voice quality across all browsers). Falls back to the browser's built-in
// speechSynthesis if the Deepgram request or playback fails for any reason,
// so a transient API/network issue never silences the interview.
//
// Two latency mitigations on top of that:
// - prefetchQuestion(text): kicks off synthesis as soon as a question's text
//   is known (e.g. right after it's fetched from the backend) instead of
//   waiting until the moment we're about to speak it, so the Deepgram
//   round-trip overlaps with whatever else happens before playback starts.
// - A per-text cache: once synthesized, replaying the same question (the
//   "replay audio" button) is instant instead of re-hitting Deepgram.
export function useSpeechSynthesis() {
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);
  const requestTokenRef = useRef(0); // invalidates a stale in-flight fetch if a newer speakQuestion()/cancelSpeech() supersedes it
  // text -> Promise<Blob>, resolved/cached for the lifetime of this hook instance (i.e. one viva session)
  const audioCacheRef = useRef(new Map());

  const stopBrowserTts = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }, []);

  const stopDeepgramAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch { /* ignore */ }
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const cancelSpeech = useCallback(() => {
    requestTokenRef.current += 1;
    stopDeepgramAudio();
    stopBrowserTts();
  }, [stopDeepgramAudio, stopBrowserTts]);

  const speakWithBrowser = useCallback((text) => {
    stopBrowserTts();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, [stopBrowserTts]);

  // Fire-and-forget: starts synthesis for `text` if it isn't already cached
  // or in flight. Safe to call multiple times with the same text.
  const prefetchQuestion = useCallback((text) => {
    if (!text) return;
    if (audioCacheRef.current.has(text)) return;
    const promise = vivaService.synthesizeSpeech(text).catch((err) => {
      // Don't cache a failure — let a later speakQuestion() retry (and, if
      // that also fails, fall back to the browser voice).
      audioCacheRef.current.delete(text);
      throw err;
    });
    audioCacheRef.current.set(text, promise);
  }, []);

  const speakQuestion = useCallback((text) => {
    if (!text) return;

    cancelSpeech();
    const myToken = requestTokenRef.current;

    prefetchQuestion(text);
    const cached = audioCacheRef.current.get(text);

    cached
      .then((blob) => {
        if (requestTokenRef.current !== myToken) return; // superseded — drop this response

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioUrlRef.current = url;
        audioRef.current = audio;

        audio.play().catch((err) => {
          console.warn('[TTS] Deepgram audio playback failed, falling back to browser voice:', err);
          if (requestTokenRef.current === myToken) speakWithBrowser(text);
        });
      })
      .catch((err) => {
        console.warn('[TTS] Deepgram synthesis unavailable, falling back to browser voice:', err);
        if (requestTokenRef.current === myToken) speakWithBrowser(text);
      });
  }, [cancelSpeech, prefetchQuestion, speakWithBrowser]);

  return { speakQuestion, cancelSpeech, prefetchQuestion };
}
