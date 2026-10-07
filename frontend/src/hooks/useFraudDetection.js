import { useEffect, useRef, useState, useCallback } from 'react';
import { useFlagEpisodes } from '@/hooks/useFlagEpisodes';
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
 * Each detector reports an *episode* (start + end), not a single event — see
 * useFlagEpisodes. A flag type that is already open is not re-triggered.
 *
 * Returns a logs array for the debug monitor panel.
 */
// While a flag stays open, remind the candidate this often. TAB_SWITCH is
// excluded: the candidate is by definition away from this page, so a toast
// here would only be seen after they're already back (which ends the flag).
const REMINDER_INTERVAL_MS = 15000;
const REMINDER_FLAGS = ['NO_FACE', 'MULTIPLE_FACES', 'FULLSCREEN_EXIT'];

const FLAG_WARNINGS = {
  TAB_SWITCH: 'Tab switching is not allowed and has been recorded.',
  FULLSCREEN_EXIT: 'Please remain in full-screen mode.',
  MULTIPLE_FACES: 'Multiple faces detected. Please ensure you are alone.',
  NO_FACE: 'Face not detected. Please stay in the camera frame.',
};

export function useFraudDetection(sessionId, activeQuestionId, isEndingRef = null) {
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

  // Episodes (and the hold-until-a-question-is-active queue) live here.
  const episodes = useFlagEpisodes(sessionId, activeQuestionId);
  const reminderTimersRef = useRef({}); // flag type -> reminder interval id


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
  // Shared episode begin/finish
  // ---------------------------------------------------------------
  const beginFlag = useCallback((flagType) => {
    if (isEndingRef && isEndingRef.current) {
      addLog(flagType, `Skipped — detection disabled (session ending)`, 'info');
      return;
    }
    // Already open for this type — don't re-warn or re-record.
    if (!episodes.start(flagType)) return;

    // User Warning Toast
    if (FLAG_WARNINGS[flagType]) {
      toast.error(`⚠️ Warning: ${FLAG_WARNINGS[flagType]}`, { id: `flag-${flagType}`, duration: 5000 });
    }

    // Keep reminding while this flag stays open. A fixed toast id makes each
    // reminder replace the previous one instead of stacking.
    if (REMINDER_FLAGS.includes(flagType)) {
      reminderTimersRef.current[flagType] = setInterval(() => {
        if (isEndingRef && isEndingRef.current) return;
        toast.error(`⚠️ Reminder: ${FLAG_WARNINGS[flagType]}`, { id: `flag-${flagType}`, duration: 5000 });
      }, REMINDER_INTERVAL_MS);
    }

    addLog(flagType, 'Episode started', 'flag');
  }, [addLog, episodes, isEndingRef]);

  const finishFlag = useCallback((flagType) => {
    clearInterval(reminderTimersRef.current[flagType]);
    delete reminderTimersRef.current[flagType];
    if (episodes.end(flagType)) addLog(flagType, 'Episode ended', 'info');
  }, [addLog, episodes]);

  // Stop all reminders when the page goes away.
  useEffect(() => {
    const timers = reminderTimersRef.current;
    return () => Object.values(timers).forEach(clearInterval);
  }, []);

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
          // No camera feed at all is itself suspicious (blocked/unplugged) —
          // flag it instead of silently running with no face monitoring.
          setDetectorStatus(prev => ({ ...prev, faceDetection: 'error', facePresent: false }));
          beginFlag('NO_FACE');
          return;
        }

        // A camera that is unplugged, disabled or blocked mid-exam leaves the
        // <video> frozen on its last frame (the face detector then keeps
        // "seeing" the old face) or stuck below readyState 2 (the poll below
        // would just skip). Check the live video track directly.
        // Read globalState.mediaStream live (not the captured `stream`): the
        // exam page may replace it after a mid-exam reload, and the old one's
        // tracks would then look "ended" and raise a false flag.
        const isCameraDead = () => {
          const current = globalState.mediaStream;
          if (current && current !== videoEl.srcObject) {
            videoEl.srcObject = current;
            videoEl.play().catch(() => {});
          }
          const track = current?.getVideoTracks()[0];
          return !track || track.readyState === 'ended' || !track.enabled || track.muted;
        };

        const registerMiss = (reason) => {
          consecutiveMisses++;
          setDetectorStatus(prev => ({ ...prev, facePresent: false }));
          // Nobody (extra) is in frame any more, so a multiple-faces episode is over.
          if (inMultipleFaceEvent) {
            inMultipleFaceEvent = false;
            finishFlag('MULTIPLE_FACES');
          }
          if (consecutiveMisses >= 2 && !inAbsenceEvent) {
            inAbsenceEvent = true;
            beginFlag('NO_FACE');
          } else if (consecutiveMisses === 1) {
            addLog('NO_FACE', `${reason} (1st miss — waiting for confirmation)`, 'warn');
          }
        };

        // inputSize raised and scoreThreshold lowered from the original
        // 224/0.4 so partially-visible/angled faces at frame edges still
        // score above threshold instead of going uncounted.
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 });

        intervalId = setInterval(async () => {
          if (!isMountedRef.current || !isActive) return;
          if (!videoEl) return;

          if (isCameraDead()) {
            registerMiss('Camera feed lost/blocked');
            return;
          }
          if (videoEl.readyState < 2) return;

          try {
            const detections = await faceapi.detectAllFaces(videoEl, options);
            const faceCount = detections.length;

            if (faceCount === 0) {
              registerMiss('No face detected');
            } else if (faceCount > 1) {
              if (inAbsenceEvent) {
                finishFlag('NO_FACE');
              }
              consecutiveMisses = 0;
              inAbsenceEvent = false;
              setDetectorStatus(prev => ({ ...prev, facePresent: true }));
              
              if (!inMultipleFaceEvent) {
                inMultipleFaceEvent = true;
                beginFlag('MULTIPLE_FACES');
                addLog('MULTIPLE_FACES', `Multiple faces detected in frame`, 'warn');
              }
            } else {
              if (inAbsenceEvent) {
                finishFlag('NO_FACE');
              }
              if (inMultipleFaceEvent) {
                finishFlag('MULTIPLE_FACES');
              }
              consecutiveMisses = 0;
              inAbsenceEvent = false;
              inMultipleFaceEvent = false;
              setDetectorStatus(prev => ({ ...prev, facePresent: true }));
            }
          } catch (e) {
            console.log(e);
          }
        // Lowered from 4000ms so a second person's brief entry/exit from
        // frame falls within a poll window instead of between two of them.
        }, 1500);
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
  }, [addLog, beginFlag, finishFlag]);

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
              beginFlag('TAB_SWITCH');
            }
          }, 500);
        }
      } else {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (hasFiredForThisHide) {
          finishFlag('TAB_SWITCH');
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
            beginFlag('TAB_SWITCH');
          }
        }, 500);
      }
    };

    const handleWindowFocus = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (hasFiredForThisHide) {
        finishFlag('TAB_SWITCH');
      }
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
  }, [addLog, beginFlag, finishFlag]);

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
      // of only the local (unrendered) monitor log. The episode is held
      // until a question is active if none is yet.
      setTimeout(() => beginFlag('FULLSCREEN_EXIT'), 0);
    }

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        wasFullscreen = true;
        setDetectorStatus(prev => ({ ...prev, fullscreen: 'active' }));
        finishFlag('FULLSCREEN_EXIT');
        addLog('FULLSCREEN', 'Re-entered fullscreen', 'info');
      } else if (wasFullscreen) {
        wasFullscreen = false;
        setDetectorStatus(prev => ({ ...prev, fullscreen: 'inactive' }));
        beginFlag('FULLSCREEN_EXIT');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [addLog, beginFlag, finishFlag]);

  return { logs, detectorStatus };
}
