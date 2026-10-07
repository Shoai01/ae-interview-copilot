import { useEffect, useRef, useState } from 'react';
import { acquireAudioGraph, releaseAudioGraph, waitForMediaStream, ANALYSER_FFT_SIZE } from '@/utils/audioGraph';
import { vivaService } from '@/services/api';
import toast from 'react-hot-toast';

const NOISE_THRESHOLD = 0.02; // ~ -34 dBFS (lowered from 0.03/-30dBFS to catch moderate voices/noise)
const SUSTAINED_CHECKS_REQUIRED = 3; // 3 * 500ms = 1.5 seconds (lowered from 2.5s so shorter bursts still trigger)
const COOLDOWN_MS = 15000; // 15 seconds (lowered from 30s so repeated short bursts are each caught)

export function useNoiseDetection(sessionId, activeQuestionId, isEndingRef, isRecording = false) {
  const [noiseLevel, setNoiseLevel] = useState('quiet'); // 'quiet', 'moderate', 'loud'
  const consecutiveLoudRef = useRef(0);
  const lastTriggeredRef = useRef(0);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(new Uint8Array(ANALYSER_FFT_SIZE));
  const isRecordingRef = useRef(isRecording);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // Acquire the shared analyser once for the whole session (component lifetime).
  // On a mid-exam page refresh, globalState.mediaStream isn't available yet on
  // first render — wait for it instead of giving up permanently.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let graph = acquireAudioGraph();
      if (!graph) {
        const stream = await waitForMediaStream();
        if (cancelled || !stream) {
          if (!stream) console.warn("No media stream available — noise detection disabled");
          return;
        }
        graph = acquireAudioGraph();
      }
      if (!graph) return;
      if (cancelled) {
        // Unmounted while we were awaiting the stream — release what we just acquired.
        releaseAudioGraph();
        return;
      }
      analyserRef.current = graph.analyserNode;
    })();

    return () => {
      cancelled = true;
      if (analyserRef.current) {
        analyserRef.current = null;
        releaseAudioGraph();
      }
    };
  }, []);

  // Poll for sustained loud noise
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isEndingRef?.current || !activeQuestionId) return;
      const analyser = analyserRef.current;
      if (!analyser) return;
      // Skip flagging while the candidate is actively recording their
      // answer — their own speaking voice isn't background noise, but
      // still update the UI noise-level indicator for feedback.
      const skipFlagging = isRecordingRef.current;

      const dataArray = dataArrayRef.current;
      analyser.getByteTimeDomainData(dataArray);

      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] / 128.0) - 1.0;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      // Update basic noise level status for UI
      if (rms > NOISE_THRESHOLD) setNoiseLevel('loud');
      else if (rms > NOISE_THRESHOLD / 2) setNoiseLevel('moderate');
      else setNoiseLevel('quiet');

      if (skipFlagging) {
        consecutiveLoudRef.current = 0;
        return;
      }

      // Check for sustained loud noise
      if (rms > NOISE_THRESHOLD) {
        consecutiveLoudRef.current += 1;
      } else {
        consecutiveLoudRef.current = 0;
      }

      if (consecutiveLoudRef.current >= SUSTAINED_CHECKS_REQUIRED) {
        const now = Date.now();
        if (now - lastTriggeredRef.current > COOLDOWN_MS) {
          lastTriggeredRef.current = now;
          consecutiveLoudRef.current = 0; // Reset counter

          toast.error("⚠️ Warning: Excessive background noise detected and recorded.");

          // A noise burst is a point-in-time event (no start/end window).
          vivaService.reportFraudFlag(sessionId, activeQuestionId, 'BACKGROUND_NOISE', 'EVENT');
        }
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [sessionId, activeQuestionId, isEndingRef]);

  return { noiseLevel };
}
