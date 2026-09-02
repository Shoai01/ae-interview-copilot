import { useEffect, useRef, useState } from 'react';
import { acquireAudioGraph, releaseAudioGraph, ANALYSER_FFT_SIZE } from '@/utils/audioGraph';
import { vivaService } from '@/services/api';
import toast from 'react-hot-toast';

const NOISE_THRESHOLD = 0.03; // ~ -30 dBFS
const SUSTAINED_CHECKS_REQUIRED = 5; // 5 * 500ms = 2.5 seconds
const COOLDOWN_MS = 30000; // 30 seconds

export function useNoiseDetection(sessionId, activeQuestionId, isEndingRef) {
  const [noiseLevel, setNoiseLevel] = useState('quiet'); // 'quiet', 'moderate', 'loud'
  const consecutiveLoudRef = useRef(0);
  const lastTriggeredRef = useRef(0);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(new Uint8Array(ANALYSER_FFT_SIZE));

  // Acquire the shared analyser once for the whole session (component lifetime)
  useEffect(() => {
    const graph = acquireAudioGraph();
    if (!graph) {
      console.warn("Failed to initialize shared audio graph for noise detection");
      return;
    }
    analyserRef.current = graph.analyserNode;

    return () => {
      analyserRef.current = null;
      releaseAudioGraph();
    };
  }, []);

  // Poll for sustained loud noise
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isEndingRef?.current || !activeQuestionId) return;
      const analyser = analyserRef.current;
      if (!analyser) return;

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

          vivaService.reportFraudFlag(sessionId, activeQuestionId, 'BACKGROUND_NOISE')
            .catch(err => console.warn("Failed to report noise flag", err));
        }
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [sessionId, activeQuestionId, isEndingRef]);

  return { noiseLevel };
}
