import { useEffect, useRef, useState, useCallback } from 'react';
import { vivaService } from '../services/api';
import { globalState } from '../store';

/**
 * Background fraud detection hook for the Viva session.
 * Runs three independent detectors:
 *   1. NO_FACE — face-api.js tiny face detector on camera stream
 *   2. TAB_SWITCH — visibilitychange + window blur
 *   3. FULLSCREEN_EXIT — fullscreenchange listener
 *
 * Returns a logs array for the debug monitor panel.
 */
export function useFraudDetection(sessionId, activeQuestionId) {
  const questionIdRef = useRef(activeQuestionId);
  const sessionIdRef = useRef(sessionId);
  const isMountedRef = useRef(true);

  // Live log state for the monitor panel
  const [logs, setLogs] = useState([]);

  // Detector status
  const [detectorStatus, setDetectorStatus] = useState({
    faceDetection: 'initializing', // 'initializing' | 'active' | 'error'
    tabSwitch: 'active',
    fullscreen: 'checking',        // 'checking' | 'active' | 'inactive'
    facePresent: null,              // true | false | null (unknown)
  });

  // Sync refs with latest props
  useEffect(() => { questionIdRef.current = activeQuestionId; }, [activeQuestionId]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // ---------------------------------------------------------------
  // Log helper — pushes to state for the monitor panel
  // ---------------------------------------------------------------
  const addLog = useCallback((type, message, severity = 'info') => {
    const entry = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      message,
      severity, // 'info' | 'warn' | 'flag' | 'error'
    };
    setLogs(prev => [...prev.slice(-49), entry]); // keep last 50
  }, []);

  // ---------------------------------------------------------------
  // Shared flag reporter
  // ---------------------------------------------------------------
  const reportFlag = useCallback((flagType) => {
    const qId = questionIdRef.current;
    const sId = sessionIdRef.current;
    if (!sId || !qId) {
      addLog(flagType, `Skipped — no active question yet`, 'warn');
      return;
    }
    addLog(flagType, `Flagged on Q${qId}`, 'flag');
    vivaService.reportFraudFlag(sId, qId, flagType);
  }, [addLog]);

  // ---------------------------------------------------------------
  // 1. NO_FACE DETECTION (face-api.js)
  // ---------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;
    let intervalId = null;
    let consecutiveMisses = 0;
    let inAbsenceEvent = false;
    let videoEl = null;

    const startFaceDetection = async () => {
      try {
        const faceapi = await import('face-api.js');
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        addLog('SYSTEM', 'Face detector model loaded', 'info');
        setDetectorStatus(prev => ({ ...prev, faceDetection: 'active' }));

        videoEl = document.createElement('video');
        videoEl.setAttribute('autoplay', '');
        videoEl.setAttribute('playsinline', '');
        videoEl.muted = true;
        videoEl.style.position = 'fixed';
        videoEl.style.top = '-9999px';
        videoEl.id = '__fraud_detection_video';
        document.body.appendChild(videoEl);

        if (globalState.mediaStream) {
          videoEl.srcObject = globalState.mediaStream;
          await videoEl.play().catch(() => {});
        }

        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });

        intervalId = setInterval(async () => {
          if (!isMountedRef.current) return;
          if (!videoEl || videoEl.readyState < 2) return;

          try {
            const detections = await faceapi.detectAllFaces(videoEl, options);
            const faceCount = detections.length;

            if (faceCount === 0) {
              consecutiveMisses++;
              setDetectorStatus(prev => ({ ...prev, facePresent: false }));
              if (consecutiveMisses >= 2 && !inAbsenceEvent) {
                inAbsenceEvent = true;
                reportFlag('NO_FACE');
              } else if (consecutiveMisses === 1) {
                addLog('NO_FACE', `No face detected (1st miss — waiting for confirmation)`, 'warn');
              }
            } else {
              if (inAbsenceEvent) {
                addLog('NO_FACE', `Face re-detected — absence event ended`, 'info');
              }
              consecutiveMisses = 0;
              inAbsenceEvent = false;
              setDetectorStatus(prev => ({ ...prev, facePresent: true }));
            }
          } catch (e) {
            console.log(e);
          }
        }, 4000);
      } catch (err) {
        addLog('SYSTEM', `Face detection init failed: ${err.message}`, 'error');
        setDetectorStatus(prev => ({ ...prev, faceDetection: 'error' }));
      }
    };

    startFaceDetection();

    return () => {
      isMountedRef.current = false;
      if (intervalId) clearInterval(intervalId);
      const el = document.getElementById('__fraud_detection_video');
      if (el) { el.srcObject = null; el.remove(); }
    };
  }, [addLog, reportFlag]);

  // ---------------------------------------------------------------
  // 2. TAB_SWITCH DETECTION
  // ---------------------------------------------------------------
  useEffect(() => {
    let debounceTimer = null;
    let hasFiredForThisHide = false;

    setTimeout(() => {
      addLog('SYSTEM', 'Tab switch detector active', 'info');
    }, 0);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!hasFiredForThisHide) {
          debounceTimer = setTimeout(() => {
            if (document.hidden) {
              hasFiredForThisHide = true;
              reportFlag('TAB_SWITCH');
            }
          }, 500);
        }
      } else {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (hasFiredForThisHide) {
          addLog('TAB_SWITCH', 'Tab refocused', 'info');
        }
        hasFiredForThisHide = false;
      }
    };

    const handleWindowBlur = () => {
      if (!hasFiredForThisHide) {
        debounceTimer = setTimeout(() => {
          if (document.hidden || !document.hasFocus()) {
            hasFiredForThisHide = true;
            reportFlag('TAB_SWITCH');
          }
        }, 500);
      }
    };

    const handleWindowFocus = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      hasFiredForThisHide = false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [addLog, reportFlag]);

  // ---------------------------------------------------------------
  // 3. FULLSCREEN_EXIT DETECTION
  // ---------------------------------------------------------------
  useEffect(() => {
    let wasFullscreen = !!document.fullscreenElement;
    setTimeout(() => {
      setDetectorStatus(prev => ({ ...prev, fullscreen: wasFullscreen ? 'active' : 'inactive' }));
    }, 0);

    if (wasFullscreen) {
      setTimeout(() => addLog('SYSTEM', 'Fullscreen active — monitoring for exits', 'info'), 0);
    } else {
      setTimeout(() => addLog('SYSTEM', 'Not in fullscreen — FULLSCREEN_EXIT detection skipped', 'warn'), 0);
    }

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        wasFullscreen = true;
        setDetectorStatus(prev => ({ ...prev, fullscreen: 'active' }));
        addLog('FULLSCREEN', 'Re-entered fullscreen', 'info');
      } else if (wasFullscreen) {
        setDetectorStatus(prev => ({ ...prev, fullscreen: 'inactive' }));
        reportFlag('FULLSCREEN_EXIT');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [addLog, reportFlag]);

  return { logs, detectorStatus };
}
