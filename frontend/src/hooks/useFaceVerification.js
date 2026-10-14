import { useCallback, useEffect, useRef, useState } from 'react';
import { vivaService } from '@/services/api';
import { globalState } from '@/store';
import { captureFrameBlob } from '@/utils/faceCapture';

const FIRST_CHECK_DELAY_MS = [15000, 30000]; // soon after the start, so a quick swap is caught early
const JITTER = 0.25; // ±25% so the schedule can't be predicted

/**
 * Identity verification during the exam.
 *
 * - Loads the server's face-verification config and whether this session
 *   already has a reference photo (WelcomeCheck normally takes it).
 * - If it doesn't, `needsReference` is true and the page must collect one via
 *   `saveReference(blob)` before checks start.
 * - Once a reference exists, sends a camera snapshot to the server at a
 *   jittered interval. The server compares it with the reference and files
 *   FACE_MISMATCH flags for trainers; the verdict is never sent back, and no
 *   failure here may interrupt the exam.
 */
export function useFaceVerification(sessionId, vivaQuestionId, isEndingRef) {
  const [config, setConfig] = useState(null);
  const [needsReference, setNeedsReference] = useState(false);
  const [checksRunning, setChecksRunning] = useState(false);
  const questionIdRef = useRef(vivaQuestionId);
  const videoRef = useRef(null);

  useEffect(() => { questionIdRef.current = vivaQuestionId; }, [vivaQuestionId]);

  // Config + reference state, once per session.
  useEffect(() => {
    if (!sessionId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const cfg = await vivaService.getFaceConfig();
        if (cancelled || !cfg.enabled) return;
        const session = await vivaService.getCurrentSession();
        if (cancelled) return;
        setConfig(cfg);
        if (session?.face_reference_set) setChecksRunning(true);
        else setNeedsReference(true);
      } catch {
        // Config unreachable: skip identity checks rather than disturb the exam.
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const ensureVideo = useCallback(async () => {
    const stream = globalState.mediaStream;
    if (!stream || !stream.active) return null;
    if (!videoRef.current) {
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      videoRef.current = v;
    }
    const v = videoRef.current;
    if (v.srcObject !== stream) {
      v.srcObject = stream;
      try { await v.play(); } catch { /* autoplay of a muted stream normally succeeds */ }
    }
    if (v.readyState < 2) {
      await new Promise((resolve) => {
        const done = () => { v.removeEventListener('loadeddata', done); resolve(); };
        v.addEventListener('loadeddata', done);
        setTimeout(done, 3000);
      });
    }
    return v;
  }, []);

  // Periodic checks.
  useEffect(() => {
    if (!checksRunning || !sessionId || !config) return undefined;
    let timer = null;
    let stopped = false;
    const intervalMs = config.check_interval_seconds * 1000;

    const schedule = (delay) => {
      timer = setTimeout(tick, delay);
    };
    const nextDelay = () => intervalMs * (1 - JITTER + Math.random() * 2 * JITTER);

    async function tick() {
      if (stopped || isEndingRef?.current) return;
      try {
        const video = await ensureVideo();
        const blob = video ? await captureFrameBlob(video) : null;
        if (blob && !stopped) await vivaService.checkFace(sessionId, blob, questionIdRef.current);
      } catch {
        // Never interrupt the trainee's exam over a failed check.
      }
      if (!stopped) schedule(nextDelay());
    }

    const [lo, hi] = FIRST_CHECK_DELAY_MS;
    schedule(lo + Math.random() * (hi - lo));
    return () => {
      stopped = true;
      clearTimeout(timer);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
    };
  }, [checksRunning, sessionId, config, isEndingRef, ensureVideo]);

  // Store the reference photo, then start checking. Returns the server's verdict
  // ({accepted, messages}) so the caller can show why a photo was refused.
  const saveReference = useCallback(async (blob) => {
    const result = await vivaService.uploadFaceReference(sessionId, blob);
    if (result.accepted) {
      setNeedsReference(false);
      setChecksRunning(true);
    }
    return result;
  }, [sessionId]);

  // Face service is down: let the exam continue without identity checks.
  const giveUp = useCallback(() => setNeedsReference(false), []);

  return { needsReference, saveReference, giveUp };
}
