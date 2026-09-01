import { useEffect, useRef, useState } from 'react';
import { globalState } from '@/store';
import { vivaService } from '@/services/api';
import toast from 'react-hot-toast';

const NOISE_THRESHOLD = 0.03; // ~ -30 dBFS
const SUSTAINED_CHECKS_REQUIRED = 5; // 5 * 500ms = 2.5 seconds
const COOLDOWN_MS = 30000; // 30 seconds

export function useNoiseDetection(sessionId, activeQuestionId, isEndingRef) {
  const [noiseLevel, setNoiseLevel] = useState('quiet'); // 'quiet', 'moderate', 'loud'
  const consecutiveLoudRef = useRef(0);
  const lastTriggeredRef = useRef(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (!globalState.mediaStream) return;

    try {
      // Create audio context only if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        sourceRef.current = audioContextRef.current.createMediaStreamSource(globalState.mediaStream);
        sourceRef.current.connect(analyserRef.current);
      }
    } catch (err) {
      console.warn("Failed to initialize AudioContext for noise detection", err);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.fftSize);
    
    const intervalId = setInterval(() => {
      if (isEndingRef?.current || !activeQuestionId) return;

      analyserRef.current.getByteTimeDomainData(dataArray);
      
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

    return () => {
      clearInterval(intervalId);
      // Clean up audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
          audioContextRef.current = null;
        } catch (e) {
          console.error("Error closing AudioContext", e);
        }
      }
    };
  }, [sessionId, activeQuestionId, isEndingRef]);

  return { noiseLevel };
}
