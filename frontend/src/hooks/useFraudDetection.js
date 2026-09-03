import { useEffect, useRef, useState, useCallback } from 'react';
import { vivaService } from '@/services/api';
import { globalState } from '@/store';
import { waitForMediaStream } from '@/utils/audioGraph';
import toast from 'react-hot-toast';

/**
 * Background fraud detection hook for the Viva session.
 * Runs three independent detectors:
 *   1. NO_FACE — face-api.js tiny face detector on camera stream
 *   2. TAB_SWITCH — visibilitychange + window blur
 *   3. FULLSCREEN_EXIT — fullscreenchange listener
 *
 * Returns a logs array for the debug monitor panel.
 */
export function useFraudDetection(sessionId, activeQuestionId, isEndingRef = null) {
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

  // Set when the exam starts outside fullscreen (so FULLSCREEN_EXIT
  // detection never even engages) and no question is active yet to attach
  // the flag to — flushed the moment a question becomes active, below.
  // Without this, a candidate who never entered fullscreen produced no
  // flag at all: nothing was ever surfaced to the trainer, only a local
  // log entry in a monitor panel that isn't rendered anywhere.
  const pendingFullscreenViolationRef = useRef(false);

  // Sync sessionId ref with latest prop (questionId's sync effect lives
  // below reportFlag's declaration — it needs to call it).
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
    if (isEndingRef && isEndingRef.current) {
      addLog(flagType, `Skipped — detection disabled (session ending)`, 'info');
      return;
    }
    const qId = questionIdRef.current;
    const sId = sessionIdRef.current;
    if (!sId || !qId) {
      addLog(flagType, `Skipped — no active question yet`, 'warn');
      return;
    }
    
    // User Warning Toast
    if (flagType === 'TAB_SWITCH') {
      toast.error('⚠️ Warning: Tab switching is not allowed and has been recorded.', { duration: 5000 });
    } else if (flagType === 'FULLSCREEN_EXIT') {
      toast.error('⚠️ Warning: Please remain in full-screen mode.', { duration: 5000 });
    } else if (flagType === 'MULTIPLE_FACES') {
      toast.error('⚠️ Warning: Multiple faces detected. Please ensure you are alone.', { duration: 5000 });
    } else if (flagType === 'NO_FACE') {
      toast.error('⚠️ Warning: Face not detected. Please stay in the camera frame.', { duration: 4000 });
    }

    addLog(flagType, `Flagged on Q${qId}`, 'flag');
    vivaService.reportFraudFlag(sId, qId, flagType);
  }, [addLog]);

  // Sync questionId ref with latest prop, and flush a pending
  // fullscreen-at-start violation (see pendingFullscreenViolationRef above)
  // the moment a question becomes active.
  useEffect(() => {
    questionIdRef.current = activeQuestionId;
    if (activeQuestionId && pendingFullscreenViolationRef.current) {
      pendingFullscreenViolationRef.current = false;
      reportFlag('FULLSCREEN_EXIT');
    }
  }, [activeQuestionId, reportFlag]);

  // ---------------------------------------------------------------
  // 1. NO_FACE DETECTION (face-api.js)
  // ---------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;
    let isActive = true;
    let intervalId = null;
    let consecutiveMisses = 0;
    let inAbsenceEvent = false;
    let inMultipleFaceEvent = false;
    let videoEl = null;

    const startFaceDetection = async () => {
      try {
        const faceapi = await import('face-api.js');
        await faceapi.nets.tinyFaceDetector.loadFromUri(`${import.meta.env.BASE_URL}models`);
        if (!isActive) return;
        
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

        // On a mid-exam page refresh, globalState.mediaStream may not be
        // (re)assigned yet at this point — wait for it instead of silently
        // skipping video assignment forever.
        const stream = globalState.mediaStream || await waitForMediaStream();
        if (!isActive) return;
        if (stream) {
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => {});
        } else {
          addLog('SYSTEM', 'No media stream available — face detection disabled', 'error');
          setDetectorStatus(prev => ({ ...prev, faceDetection: 'error' }));
          return;
        }

        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });

        intervalId = setInterval(async () => {
          if (!isMountedRef.current || !isActive) return;
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
            } else if (faceCount > 1) {
              if (inAbsenceEvent) {
                addLog('NO_FACE', `Face re-detected — absence event ended`, 'info');
              }
              consecutiveMisses = 0;
              inAbsenceEvent = false;
              setDetectorStatus(prev => ({ ...prev, facePresent: true }));
              
              if (!inMultipleFaceEvent) {
                inMultipleFaceEvent = true;
                reportFlag('MULTIPLE_FACES');
                addLog('MULTIPLE_FACES', `Multiple faces detected in frame`, 'warn');
              }
            } else {
              if (inAbsenceEvent) {
                addLog('NO_FACE', `Face re-detected — absence event ended`, 'info');
              }
              if (inMultipleFaceEvent) {
                addLog('MULTIPLE_FACES', `Returned to single face`, 'info');
              }
              consecutiveMisses = 0;
              inAbsenceEvent = false;
              inMultipleFaceEvent = false;
              setDetectorStatus(prev => ({ ...prev, facePresent: true }));
            }
          } catch (e) {
            console.log(e);
          }
        }, 4000);
      } catch (err) {
        if (!isActive) return;
        addLog('SYSTEM', `Face detection init failed: ${err.message}`, 'error');
        setDetectorStatus(prev => ({ ...prev, faceDetection: 'error' }));
      }
    };

    startFaceDetection();

    return () => {
      isMountedRef.current = false;
      isActive = false;
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
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            if (document.hidden || !document.hasFocus()) {
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
        if (debounceTimer) clearTimeout(debounceTimer);
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
      // Surface this to the trainer like any other integrity flag instead
      // of only the local (unrendered) monitor log — report immediately if
      // a question is already active, otherwise once one becomes active.
      if (questionIdRef.current && sessionIdRef.current) {
        reportFlag('FULLSCREEN_EXIT');
      } else {
        pendingFullscreenViolationRef.current = true;
      }
    }

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        wasFullscreen = true;
        setDetectorStatus(prev => ({ ...prev, fullscreen: 'active' }));
        addLog('FULLSCREEN', 'Re-entered fullscreen', 'info');
      } else if (wasFullscreen) {
        wasFullscreen = false;
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
