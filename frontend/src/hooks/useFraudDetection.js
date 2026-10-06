import { useEffect, useRef, useState, useCallback } from 'react';
import { vivaService } from '@/services/api';
import { globalState } from '@/store';
import { waitForMediaStream } from '@/utils/audioGraph';
import toast from 'react-hot-toast';

// TinyFaceDetector's own duplicate-box suppression uses a FIXED IoU
// threshold of 0.4 baked into its model config (tinyYolov2/const.js,
// IOU_THRESHOLD) — it is not exposed via TinyFaceDetectorOptions, so
// raising inputSize/lowering scoreThreshold (done to catch partial faces)
// made it more likely for two overlapping candidate boxes on the SAME
// face to both survive that fixed threshold and inflate faceCount past 1
// for a single real face. This is a second, more aggressive dedup pass
// on top of that fixed one, applied to our own counted detections.
function mergeOverlappingFaceBoxes(detections, iouThreshold = 0.3) {
  const boxes = detections.map((d) => d.box);
  const kept = [];
  const order = detections
    .map((d, i) => i)
    .sort((a, b) => detections[b].score - detections[a].score);

  const iou = (a, b) => {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (interArea <= 0) return 0;
    const unionArea = a.width * a.height + b.width * b.height - interArea;
    return unionArea > 0 ? interArea / unionArea : 0;
  };

  for (const idx of order) {
    const box = boxes[idx];
    const overlapsKept = kept.some((keptIdx) => iou(box, boxes[keptIdx]) > iouThreshold);
    if (!overlapsKept) kept.push(idx);
  }
  return kept.map((idx) => detections[idx]);
}

// Cheap average-luminance sample (downscaled to a tiny canvas) to decide
// whether the frame needs brightening before detection — TinyFaceDetector
// (and the person detector) both degrade in low light, which threshold
// tuning alone can't fix since the face's features simply aren't
// distinguishable in the raw pixel data at that point.
const LUMINANCE_SAMPLE_SIZE = 32;
const DARK_LUMINANCE_THRESHOLD = 90; // 0-255 scale; below this, brighten before detecting

function sampleAverageLuminance(videoEl, sampleCanvas) {
  const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(videoEl, 0, 0, LUMINANCE_SAMPLE_SIZE, LUMINANCE_SAMPLE_SIZE);
  const { data } = ctx.getImageData(0, 0, LUMINANCE_SAMPLE_SIZE, LUMINANCE_SAMPLE_SIZE);
  let sum = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    // Standard relative luminance weighting.
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / pixelCount;
}

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

  // Flags raised before any question is active yet (e.g. the candidate
  // switches tabs or exits fullscreen during the welcome/instructions
  // screen) have no viva_question_id to attach to. Queue them here and
  // flush once a question becomes active, instead of dropping them —
  // previously these were only logged to the local (unrendered) monitor
  // panel and never reached the trainer at all.
  const pendingFlagsRef = useRef([]);

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
      pendingFlagsRef.current.push(flagType);
      addLog(flagType, `Queued — no active question yet, will record once one starts`, 'warn');
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

  // Sync questionId ref with latest prop, and flush any flags queued
  // before a question was active (see pendingFlagsRef above) the moment
  // one becomes active.
  useEffect(() => {
    questionIdRef.current = activeQuestionId;
    if (activeQuestionId && pendingFlagsRef.current.length > 0) {
      const queued = pendingFlagsRef.current;
      pendingFlagsRef.current = [];
      queued.forEach(reportFlag);
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
    let wasBrightening = false;

    // Second-person detection via a whole-body "person" object detector
    // rather than relying solely on the face detector above. A face
    // detector needs enough facial features (eyes/nose/mouth) to register
    // anything, so a second person who is only half in frame routinely
    // produces no detection at all regardless of threshold tuning — that's
    // a model-family limitation, not something scoreThreshold can fix.
    // The underlying SSD "person" class is trained on plenty of
    // partially-occluded people, so it catches a shoulder or side-profile
    // that TinyFaceDetector would simply never see.
    //
    // This uses our own loadGraphModel call against the self-hosted model
    // (personDetector.js) instead of the @tensorflow-models/coco-ssd
    // package, because: (a) the installed coco-ssd version has no way to
    // override its hardcoded fetch from storage.googleapis.com, and (b) a
    // modern coco-ssd/tfjs version pulls in @tensorflow/tfjs-core 4.x,
    // which crashes when loaded alongside face-api.js's bundled 1.7.0 (two
    // different major tfjs engine versions fighting over the same global
    // registry — not fixable by threshold tuning either). Pinning
    // everything to tfjs-core@1.7.0 (see package.json "overrides") avoids
    // that clash entirely.
    let personDetectorModel = null;
    // Captured from the dynamic import below — kept as a plain variable
    // (rather than a static top-of-file import) so tfjs + this detection
    // code stay in their own lazy chunk, loaded only when this effect
    // actually runs, not bundled into every page's initial load.
    let countPersonsFn = null;
    // Lowered from 0.5 — a partially visible second person likely scores
    // lower than a fully visible one; the debug logging below surfaces raw
    // scores so this can be tuned against real footage once we see what
    // partial appearances actually score.
    const PERSON_SCORE_THRESHOLD = 0.35;

    const loadPersonDetector = async () => {
      try {
        const personDetector = await import('@/utils/personDetector');
        countPersonsFn = personDetector.countPersons;
        // Self-hosted (frontend/public/models/coco-ssd) — same pattern
        // already used for face-api.js's models — so this doesn't add a
        // new external network dependency.
        personDetectorModel = await personDetector.loadPersonDetector(
          `${import.meta.env.BASE_URL}models/coco-ssd/model.json`
        );
        if (!isActive) { personDetectorModel = null; return; }
        console.log('[FraudDetection] Person detector model loaded successfully');
        addLog('SYSTEM', 'Person detector model loaded', 'info');
      } catch (err) {
        console.error('[FraudDetection] Person detector failed to load:', err);
        addLog('SYSTEM', `Person detector init failed: ${err.message}`, 'error');
      }
    };

    const startFaceDetection = async () => {
      try {
        const faceapi = await import('face-api.js');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(`${import.meta.env.BASE_URL}models`),
          loadPersonDetector(),
        ]);
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

        // inputSize raised and scoreThreshold lowered from the original
        // 224/0.4 so partially-visible/angled faces at frame edges still
        // score above threshold instead of going uncounted.
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 });

        // Tiny canvas for cheap luminance sampling, and a full-size one
        // reused only when the frame is actually dark enough to need
        // brightening before detection (avoids the draw/filter cost on
        // every tick when lighting is already fine).
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = LUMINANCE_SAMPLE_SIZE;
        sampleCanvas.height = LUMINANCE_SAMPLE_SIZE;
        const enhanceCanvas = document.createElement('canvas');

        intervalId = setInterval(async () => {
          if (!isMountedRef.current || !isActive) return;
          if (!videoEl || videoEl.readyState < 2) return;

          try {
            // Pick the detection source: the raw video frame normally, or
            // a brightened canvas copy of it when the room is too dark for
            // the model to pick out facial features at all — tuning
            // scoreThreshold doesn't help when the pixel data itself has
            // too little contrast to work with.
            let detectionSource = videoEl;
            try {
              const avgLuminance = sampleAverageLuminance(videoEl, sampleCanvas);
              if (avgLuminance < DARK_LUMINANCE_THRESHOLD) {
                const vw = videoEl.videoWidth || 640;
                const vh = videoEl.videoHeight || 480;
                enhanceCanvas.width = vw;
                enhanceCanvas.height = vh;
                const ctx = enhanceCanvas.getContext('2d');
                // Darker frames get a stronger boost, capped so it doesn't
                // blow out whatever light there is.
                const boost = Math.min(2.2, 1 + (DARK_LUMINANCE_THRESHOLD - avgLuminance) / 60);
                ctx.filter = `brightness(${boost.toFixed(2)}) contrast(1.15)`;
                ctx.drawImage(videoEl, 0, 0, vw, vh);
                detectionSource = enhanceCanvas;
                if (!wasBrightening) {
                  wasBrightening = true;
                  console.log(`[FraudDetection] Low light detected (avg luminance ${avgLuminance.toFixed(0)}) — brightening frame before detection (boost ${boost.toFixed(2)})`);
                  addLog('SYSTEM', 'Low light detected — brightening camera frame for detection', 'info');
                }
              } else if (wasBrightening) {
                wasBrightening = false;
                addLog('SYSTEM', 'Lighting back to normal — detection using raw frame', 'info');
              }
            } catch (e) {
              // Luminance sampling/canvas drawing failed (e.g. tainted
              // canvas) — fall back to the raw video frame, same as before.
              console.log(e);
            }

            const rawDetections = await faceapi.detectAllFaces(detectionSource, options);
            const detections = mergeOverlappingFaceBoxes(rawDetections);
            const faceCount = detections.length;
            if (rawDetections.length !== detections.length) {
              console.log(`[FraudDetection] Merged ${rawDetections.length} raw face boxes down to ${detections.length} (removed overlapping duplicates)`);
            }

            // Person-count check runs independently of face count — a
            // second person who registers 0 faces (turned away, partially
            // out of frame) can still register as a "person" here.
            let personCount = 0;
            if (personDetectorModel && countPersonsFn) {
              try {
                const { personCount: count, personScores } = await countPersonsFn(
                  personDetectorModel, detectionSource, PERSON_SCORE_THRESHOLD
                );
                personCount = count;
                // Temporary debug visibility — log every person-class
                // detection with its raw score, even ones below threshold,
                // so we can see what the model is actually seeing (e.g. a
                // partial second person scoring 0.3 would show up here even
                // though it doesn't count toward personCount yet).
                if (personScores.length > 0) {
                  console.log('[FraudDetection] person scores:', personScores.map((s) => s.toFixed(2)));
                }
              } catch (e) {
                console.error('[FraudDetection] person detection failed:', e);
              }
            }

            if (faceCount === 0) {
              consecutiveMisses++;
              setDetectorStatus(prev => ({ ...prev, facePresent: false }));
              if (consecutiveMisses >= 2 && !inAbsenceEvent) {
                inAbsenceEvent = true;
                reportFlag('NO_FACE');
              } else if (consecutiveMisses === 1) {
                addLog('NO_FACE', `No face detected (1st miss — waiting for confirmation)`, 'warn');
              }
              // A candidate briefly turned away (0 faces) can still have a
              // second person fully visible behind them — check regardless.
              if (personCount > 1 && !inMultipleFaceEvent) {
                inMultipleFaceEvent = true;
                reportFlag('MULTIPLE_FACES');
                addLog('MULTIPLE_FACES', `Additional person detected (person-detector) while no face in frame`, 'warn');
              } else if (personCount <= 1 && inMultipleFaceEvent) {
                inMultipleFaceEvent = false;
              }
            } else {
              const multiplePersonsDetected = faceCount > 1 || personCount > 1;

              if (inAbsenceEvent) {
                addLog('NO_FACE', `Face re-detected — absence event ended`, 'info');
              }
              consecutiveMisses = 0;
              inAbsenceEvent = false;
              setDetectorStatus(prev => ({ ...prev, facePresent: true }));

              if (multiplePersonsDetected) {
                if (!inMultipleFaceEvent) {
                  inMultipleFaceEvent = true;
                  reportFlag('MULTIPLE_FACES');
                  addLog(
                    'MULTIPLE_FACES',
                    faceCount > 1
                      ? `Multiple faces detected in frame`
                      : `Additional person detected (person-detector, partial/angled face)`,
                    'warn'
                  );
                }
              } else if (inMultipleFaceEvent) {
                inMultipleFaceEvent = false;
                addLog('MULTIPLE_FACES', `Returned to single person`, 'info');
              }
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
      if (personDetectorModel) { personDetectorModel.dispose?.(); personDetectorModel = null; }
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
      // of only the local (unrendered) monitor log. reportFlag queues it
      // itself via pendingFlagsRef if no question is active yet.
      reportFlag('FULLSCREEN_EXIT');
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
