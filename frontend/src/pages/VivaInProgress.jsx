import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, IconButton, Button, CircularProgress, Tooltip } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SendIcon from '@mui/icons-material/Send';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import api, { vivaService } from '@/services/api';
import { globalState, AUDIO_CONSTRAINTS } from '@/store';
import TranscriptPanel from '@/components/TranscriptPanel';
import ExamSidebar from '@/components/ExamSidebar';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useFraudDetection } from '@/hooks/useFraudDetection';
import { useNoiseDetection } from '@/hooks/useNoiseDetection';
import { useAuth } from '@/store/AuthContext';
import toast from 'react-hot-toast';


export default function VivaInProgress() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken } = useAuth();
  const videoRef = useRef(null);

  // 1. Session-State Preservation: Restore session from location.state or sessionStorage
  const getInitialSession = () => {
    if (location.state?.sessionId) {
      const data = {
        sessionId: location.state.sessionId,
        moduleName: location.state.moduleName || 'Module',
        traineeName: location.state.traineeName || 'Candidate',
        durationMinutes: location.state.durationMinutes || 15,
        startTime: location.state.startTime || null
      };
      try {
        sessionStorage.setItem('active_viva_session', JSON.stringify(data));
      } catch {}
      return data;
    }
    try {
      const saved = sessionStorage.getItem('active_viva_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  };

  const [sessionInfo, setSessionInfo] = useState(getInitialSession);
  const sessionId = sessionInfo.sessionId;
  const moduleName = sessionInfo.moduleName || 'Module';
  const traineeName = sessionInfo.traineeName || 'Candidate';
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Server-synced countdown timer
  const [sessionStartTime, setSessionStartTime] = useState(sessionInfo.startTime || null);
  const [sessionDuration, setSessionDuration] = useState(sessionInfo.durationMinutes || 15);
  const [nowTime, setNowTime] = useState(Date.now());
  // server_time (from /health) minus local Date.now() at the moment of that
  // response, adjusted for round-trip latency — added to nowTime so the
  // countdown tracks the server's clock instead of blindly trusting the
  // candidate's machine. A slow local clock previously granted extra time;
  // a fast one triggered auto-submit early. Re-synced periodically to
  // correct for drift over a long exam, not just once at mount.
  const [clockOffset, setClockOffset] = useState(0);
  const isAutoSubmittingRef = useRef(false);
  const isEndingRef = useRef(false);
  const hasWarnedTimeRef = useRef(false);

  const syncServerClock = useCallback(async () => {
    const requestSentAt = Date.now();
    try {
      const res = await api.get('/health', { timeout: 5000 });
      const requestReceivedAt = Date.now();
      const serverTimeMs = res.data?.server_time ? new Date(res.data.server_time).getTime() : NaN;
      if (!isNaN(serverTimeMs)) {
        // Assume symmetric latency — estimate the server's clock at the
        // midpoint of the round trip, then diff against that midpoint.
        const roundTripMidpoint = (requestSentAt + requestReceivedAt) / 2;
        setClockOffset(serverTimeMs - roundTripMidpoint);
      }
    } catch {
      // Sync failed (offline blip, etc.) — keep the last known offset
      // rather than falling back to raw, uncorrected local time.
    }
  }, []);

  useEffect(() => {
    syncServerClock();
    const resyncInterval = setInterval(syncServerClock, 60000);
    return () => clearInterval(resyncInterval);
  }, [syncServerClock]);

  // Clock tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fraud and noise detection hooks
  const { detectorStatus } = useFraudDetection(sessionId, currentQuestion?.viva_question_id, isEndingRef);
  const { noiseLevel } = useNoiseDetection(sessionId, currentQuestion?.viva_question_id, isEndingRef);

  // 2. Active Session Recovery: Fallback to server query if storage is missing on reload
  useEffect(() => {
    if (!sessionId) {
      vivaService.getCurrentSession().then(s => {
        if (s && s.id && s.status === 'IN_PROGRESS') {
          const recovered = {
            sessionId: s.id,
            moduleName: s.module_name || 'Module',
            traineeName: s.trainee_name || 'Candidate',
            durationMinutes: s.duration_minutes || 15,
            startTime: s.start_time
          };
          try {
            sessionStorage.setItem('active_viva_session', JSON.stringify(recovered));
          } catch {}
          setSessionInfo(recovered);
          setSessionStartTime(s.start_time);
          setSessionDuration(s.duration_minutes || 15);
        } else {
          navigate('/');
        }
      }).catch(() => {
        navigate('/');
      });
    } else if (!sessionStartTime || !sessionInfo.durationMinutes) {
      vivaService.getCurrentSession().then(s => {
        if (s) {
          if (s.start_time) setSessionStartTime(s.start_time);
          if (s.duration_minutes) setSessionDuration(s.duration_minutes);
        }
      }).catch(() => {});
    }
  }, [sessionId, sessionStartTime, sessionInfo.durationMinutes, navigate]);

  // 3. Hardware Stream Re-acquisition: Restore camera/mic if destroyed by refresh
  useEffect(() => {
    let isCancelled = false;
    const restoreMedia = async () => {
      if (!globalState.mediaStream || !globalState.mediaStream.active) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: AUDIO_CONSTRAINTS
          });
          if (!isCancelled) {
            globalState.mediaStream = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          }
        } catch (err) {
          console.warn("[VivaInProgress] Could not re-acquire media stream on reload:", err);
        }
      } else if (videoRef.current) {
        videoRef.current.srcObject = globalState.mediaStream;
      }
    };

    restoreMedia();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 4. Tab Closure / Refresh Guard: Warn user before leaving active exam
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isEndingRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const mountTimeRef = useRef(Date.now());

  // Safe UTC timestamp parser to avoid local timezone offset miscalculations
  const parseUtcTimestamp = (timeVal) => {
    if (!timeVal) return null;
    if (typeof timeVal === 'number') return timeVal;
    let s = String(timeVal).trim();
    if (!s) return null;
    // If no timezone offset is present (no Z, no +, no - after time part), append Z for UTC
    if (!s.endsWith('Z') && !s.includes('+') && !/[-+]\d{2}:\d{2}$/.test(s)) {
      s = s + 'Z';
    }
    const t = new Date(s).getTime();
    return isNaN(t) ? null : t;
  };

  // Server-synced countdown timer math
  const parsedStartTime = parseUtcTimestamp(sessionStartTime);
  const totalSeconds = (sessionDuration || 15) * 60;
  
  // Calculate elapsed seconds based on UTC server start time, correcting
  // nowTime for the candidate machine's clock offset from the server (see
  // syncServerClock above); clamp any remaining skew to 0.
  const elapsedSeconds = parsedStartTime
    ? Math.max(0, Math.floor((nowTime + clockOffset - parsedStartTime) / 1000))
    : 0;
  const remainingSeconds = Math.min(totalSeconds, Math.max(0, totalSeconds - elapsedSeconds));
  const timerMinutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const timerSecs = String(remainingSeconds % 60).padStart(2, '0');
  
  // Only trigger timeout if parsedStartTime is valid, remaining is strictly 0, and page has been loaded for > 5 seconds
  const isMountedLongEnough = (nowTime - mountTimeRef.current) > 5000;
  const timerExpired = parsedStartTime !== null && remainingSeconds <= 0 && isMountedLongEnough;
  const timerWarning = remainingSeconds <= 120 && remainingSeconds > 0; // last 2 min

  const { 
    isRecording, 
    isConnecting,
    liveText,
    setLiveText, 
    finalText, 
    setFinalText, 
    toggleRecording,
    stopRecording,
    startRecording,
    cancelConnecting,
    closeConnection,
    resetTranscript,
    getAudioBlob,
    getTranscriptText,
    startAudioCapture,
    stopAudioCapture,
  } = useSpeechRecognition();
  
  const { speakQuestion, cancelSpeech, prefetchQuestion } = useSpeechSynthesis();

  // Compute the display value for the text field.
  const displayValue = finalText + (liveText ? (finalText ? ' ' : '') + liveText : '');

  const handleTranscriptChange = useCallback((e) => {
    setFinalText(e.target.value);
    setLiveText('');
  }, [setFinalText, setLiveText]);

  // 5. In-flight Transcript Draft Preservation: Restore draft when question loads
  useEffect(() => {
    if (sessionId && currentQuestion?.viva_question_id) {
      try {
        const savedDraft = sessionStorage.getItem(`viva_draft_${sessionId}_${currentQuestion.viva_question_id}`);
        if (savedDraft && savedDraft.trim()) {
          setFinalText(savedDraft);
        }
      } catch {}
    }
  }, [sessionId, currentQuestion?.viva_question_id, setFinalText]);

  // 6. In-flight Transcript Draft Preservation: Save only confirmed text.
  useEffect(() => {
    if (!sessionId || !currentQuestion?.viva_question_id) return;

    const draftKey = `viva_draft_${sessionId}_${currentQuestion.viva_question_id}`;
    try {
      if (finalText.trim()) {
        sessionStorage.setItem(draftKey, finalText);
      } else {
        sessionStorage.removeItem(draftKey);
      }
    } catch {
      // Ignore storage errors; transcript submission still uses in-memory state.
    }
  }, [sessionId, currentQuestion?.viva_question_id, finalText]);

  const fetchQuestion = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const question = await vivaService.getNextQuestion(sessionId);
      // Start synthesizing this question's audio immediately — before the
      // re-render/effect cycle that would otherwise trigger it — so the
      // Deepgram round-trip overlaps with that instead of starting after it.
      if (question?.text) prefetchQuestion(question.text);
      setCurrentQuestion(question);
      resetTranscript();
    } catch (err) {
      console.error("Failed to fetch question:", err);
      // If 404 (session completed or all questions answered), navigate to complete page
      if (err.response?.status === 404) {
        if (globalState.mediaStream) {
          globalState.mediaStream.getTracks().forEach(track => track.stop());
          globalState.mediaStream = null;
        }
        isEndingRef.current = true;
        try {
          sessionStorage.removeItem('active_viva_session');
        } catch {}
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        navigate('/complete', { state: { sessionId } });
        return;
      }
      toast.error("Failed to load the next question. Please refresh.", { id: 'next-question-error' });
    } finally {
      setLoading(false);
    }
  }, [sessionId, resetTranscript, navigate, prefetchQuestion]);

  useEffect(() => {
    if (!sessionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuestion();
    
    if (globalState.mediaStream && videoRef.current) {
      videoRef.current.srcObject = globalState.mediaStream;
    }
    
    return () => {
      cancelSpeech();
    };
  }, [sessionId, fetchQuestion, cancelSpeech]);

  useEffect(() => {
    if (currentQuestion && currentQuestion.text && !loading) {
      speakQuestion(currentQuestion.text);
    }
  }, [currentQuestion, loading, speakQuestion]);

  const handleAutoSubmit = useCallback(async () => {
    if (isAutoSubmittingRef.current || submitting) return;
    isAutoSubmittingRef.current = true;
    setSubmitting(true);
    cancelSpeech();

    toast("Session duration has expired. Submitting your assessment...", {
      icon: '⏱️',
      duration: 5000,
      id: 'session-timeout-auto'
    });

    try {
      if (isRecording) {
        await stopRecording();
      }
      if (isConnecting) {
        cancelConnecting();
      }
      await closeConnection();
      await stopAudioCapture();

      if (currentQuestion) {
        const transcriptToSubmit = getTranscriptText() || "(Session duration expired)";
        try {
          await vivaService.submitAnswer(sessionId, currentQuestion.viva_question_id, transcriptToSubmit);
          try {
            sessionStorage.removeItem(`viva_draft_${sessionId}_${currentQuestion.viva_question_id}`);
          } catch {}
          const recordedBlob = getAudioBlob();
          if (recordedBlob && recordedBlob.size > 0) {
            await vivaService.uploadAnswerAudio(sessionId, currentQuestion.viva_question_id, recordedBlob, accessToken);
          }
        } catch (partialErr) {
          console.warn("Auto-submit partial answer save failed:", partialErr);
        }
      }
    } catch (e) {
      console.warn("Auto-submit cleanup error:", e);
    } finally {
      if (globalState.mediaStream) {
        globalState.mediaStream.getTracks().forEach(track => track.stop());
        globalState.mediaStream = null;
      }

      isEndingRef.current = true;
      try {
        sessionStorage.removeItem('active_viva_session');
      } catch {}
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      vivaService.evaluateSession(sessionId).catch(e => console.error("Evaluation error on timeout:", e));

      navigate('/complete', { state: { sessionId, timeExpired: true } });
    }
  }, [submitting, cancelSpeech, isRecording, isConnecting, stopRecording, cancelConnecting, closeConnection, stopAudioCapture, currentQuestion, getTranscriptText, sessionId, getAudioBlob, accessToken, navigate]);

  // Enforce automated submission immediately when time expires
  useEffect(() => {
    if (timerExpired && !loading && currentQuestion && !isAutoSubmittingRef.current) {
      handleAutoSubmit();
    }
  }, [timerExpired, loading, currentQuestion, handleAutoSubmit]);

  // One-time alert when the session enters its final stretch — the sidebar
  // timer already turns amber, but a toast makes the low-time warning
  // impossible to miss even if the trainee isn't looking at it.
  useEffect(() => {
    if (timerWarning && !hasWarnedTimeRef.current) {
      hasWarnedTimeRef.current = true;
      toast('Only 2 minutes left! Please wrap up your answer.', {
        icon: '⏳',
        duration: 6000,
        id: 'session-time-warning',
      });
    }
  }, [timerWarning]);

  const handleNextAction = async () => {
    if (!currentQuestion || submitting) return;
    
    setSubmitting(true);
    cancelSpeech();

    try {
      // If still transcribing, stop Deepgram
      if (isRecording) {
        await stopRecording();
      }

      // If Deepgram connection is still in-flight, cancel it
      if (isConnecting) {
        cancelConnecting();
      }

      // Read transcript from refs to avoid stale closure values
      const transcriptToSubmit = getTranscriptText();

      // 1. Submit transcript JSON to answer endpoint — deliberately BEFORE
      //    stopAudioCapture(). If this fails (network blip) and the
      //    candidate retries by tapping the mic, startAudioCapture() sees a
      //    'paused' recorder and resumes it; only a torn-down ('inactive')
      //    recorder gets its chunks wiped for a fresh take. Tearing down
      //    audio capture before this point risked silently losing the
      //    original recording on a failed-then-retried submit.
      await vivaService.submitAnswer(sessionId, currentQuestion.viva_question_id, transcriptToSubmit);
      try {
        sessionStorage.removeItem(`viva_draft_${sessionId}_${currentQuestion.viva_question_id}`);
      } catch {}

      // Now safe to finalize the archival recording and grab the Blob.
      await stopAudioCapture();

      // 2. Immediately submit the recorded audio Blob to the /audio endpoint
      const recordedBlob = getAudioBlob();
      console.log(`[Viva] Submitting audio for question ${currentQuestion.viva_question_id}:`, recordedBlob?.size, 'bytes');
      if (recordedBlob && recordedBlob.size > 0) {
        try {
          const res = await vivaService.uploadAnswerAudio(sessionId, currentQuestion.viva_question_id, recordedBlob, accessToken);
          console.log("[Viva] Audio uploaded successfully:", res);
        } catch (audioErr) {
          console.error("Failed to upload audio recording:", audioErr);
          toast.error("Voice recording could not be saved. The trainer may not see audio for this question.");
        }
      }
      
      if (currentQuestion.is_last_question) {
        // Session is truly ending — now it's safe to actually close the
        // Deepgram connection (kept warm across questions until this point).
        await closeConnection();

        if (globalState.mediaStream) {
          globalState.mediaStream.getTracks().forEach(track => track.stop());
          globalState.mediaStream = null;
        }

        // Exit fullscreen when the session finishes
        isEndingRef.current = true;
        try {
          sessionStorage.removeItem('active_viva_session');
        } catch {}
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        // Trigger AI evaluation in the background before navigating
        vivaService.evaluateSession(sessionId).catch(e => {
          console.error("Evaluation failed", e);
          toast.error(e.response?.data?.detail || "Failed to submit evaluation.");
        });
        navigate('/complete', { state: { sessionId } });
      } else {
        fetchQuestion();
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
      toast.error(err.response?.data?.detail || "Failed to submit answer.");
    } finally {
      setSubmitting(false);
    }
  };

  // Surface the proctoring signals both detector hooks already compute
  // (previously tracked in state but never rendered anywhere — candidates
  // only saw a transient toast at the moment of a violation, with no
  // passive "is this actually working" indicator in between).
  const proctoringHasError = detectorStatus.faceDetection === 'error' || detectorStatus.facePresent === false;
  const proctoringHasWarning = detectorStatus.fullscreen === 'inactive' || noiseLevel === 'loud';
  const proctoringColor = proctoringHasError ? '#EF4444' : proctoringHasWarning ? '#F59E0B' : '#22C55E';
  const proctoringSummary = [
    `Face detection: ${detectorStatus.faceDetection}${detectorStatus.facePresent === false ? ' — no face in frame' : ''}`,
    `Fullscreen: ${detectorStatus.fullscreen}`,
    `Background noise: ${noiseLevel}`,
  ].join('\n');

  const timerAccentColor = timerExpired ? '#EF4444' : timerWarning ? '#F59E0B' : '#F26522';
  const timerTrackColor = timerExpired ? 'rgba(239, 68, 68, 0.15)' : timerWarning ? 'rgba(245, 158, 11, 0.15)' : '#E2E8F0';
  const timeRatio = totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', position: 'relative' }}>

      <ExamSidebar
        traineeName={traineeName}
        moduleName={moduleName}
        durationMinutes={sessionDuration}
        currentIndex={currentQuestion?.current_question_index}
        total={currentQuestion?.total_questions}
        timerMinutes={timerMinutes}
        timerSecs={timerSecs}
        timerAccentColor={timerAccentColor}
        timerTrackColor={timerTrackColor}
        timeRatio={timeRatio}
        timerExpired={timerExpired}
        timerWarning={timerWarning}
      />

      {/* Floating Picture-In-Picture Webcam Viewfinder */}
      <Box
        sx={{
          position: 'fixed',
          top: { xs: 24, md: 32 },
          right: { xs: 16, md: 28 },
          width: { xs: 130, sm: 180, md: 210 },
          aspectRatio: '4/3',
          borderRadius: 2,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.14)',
          zIndex: 35,
          bgcolor: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          component="video"
          ref={videoRef}
          autoPlay
          playsInline
          muted
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          aria-label="Candidate Video stream"
        />
        <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{proctoringSummary}</span>} arrow placement="left">
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(4px)',
              px: 0.85,
              py: 0.35,
              borderRadius: 1,
              cursor: 'default',
            }}
          >
            <ShieldOutlinedIcon sx={{ fontSize: 13, color: proctoringColor }} />
            <Box sx={{ width: 6, height: 6, bgcolor: proctoringColor, borderRadius: '50%', boxShadow: `0 0 6px ${proctoringColor}` }} />
          </Box>
        </Tooltip>
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            bgcolor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            px: 1,
            py: 0.35,
            borderRadius: 1,
          }}
        >
          <Box sx={{ width: 6, height: 6, bgcolor: '#22C55E', borderRadius: '50%', boxShadow: '0 0 6px #22C55E' }} />
          <Typography variant="caption" sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.04em' }}>
            LIVE
          </Typography>
        </Box>
      </Box>

      {/* Central Exam Workspace — offset by the fixed sidebar's width; the
          inner box centers itself within that remaining space via flex,
          rather than fighting the offset with an auto margin. */}
      <Box
        component="main"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ml: { xs: 0, md: '296px' },
          px: 3,
          pt: { xs: 6, sm: 6, md: 7 },
          pb: 6,
          minHeight: '100vh',
          zIndex: 10,
        }}
      >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 820 }}>
        {/* Question Statement Section */}
        <Box sx={{ width: '100%', textAlign: 'center', mb: 4 }}>
          <Tooltip title="Replay question audio" arrow placement="top">
            <IconButton
              onClick={() => currentQuestion && speakQuestion(currentQuestion.text)}
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#64748B',
                mb: 2.5,
                transition: 'all 0.18s ease',
                '&:hover': { color: 'primary.main', borderColor: 'primary.main', bgcolor: 'rgba(242, 101, 34, 0.04)' },
              }}
            >
              <VolumeUpIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>

          <Typography
            variant="h4"
            sx={{
              fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2.1rem' },
              letterSpacing: '-0.02em',
              mb: 3,
              fontWeight: 600,
              color: '#0F172A',
              lineHeight: 1.35,
            }}
          >
            {loading ? "Generating your viva question..." : currentQuestion ? currentQuestion.text : "Session Complete"}
          </Typography>

          {/* Soundwave audio visualizer */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', height: 28 }}>
            {[0, 0.1, 0.2, 0.3, 0.4, 0.2, 0.1].map((delay, i) => (
              <Box
                key={i}
                sx={{
                  width: 3.5,
                  height: isRecording ? '20px' : '6px',
                  bgcolor: isRecording ? 'primary.main' : '#CBD5E1',
                  borderRadius: 2,
                  animation: isRecording ? 'pulse-wave 1.1s infinite ease-in-out alternate' : 'none',
                  animationDelay: `${delay}s`,
                  transition: 'height 0.2s ease, background-color 0.2s ease',
                  '@keyframes pulse-wave': {
                    '0%': { height: '6px' },
                    '100%': { height: '26px' },
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Interaction & Transcription Workspace */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 680 }}>
          
          {/* Main Microphone Action Button */}
          <IconButton
            aria-label="Toggle Recording"
            onClick={() => {
              if (!isRecording) cancelSpeech();
              toggleRecording();
            }}
            disabled={isConnecting || submitting}
            sx={{
              width: 88,
              height: 88,
              bgcolor: isRecording ? '#EF4444' : isConnecting ? '#E2E8F0' : '#F26522',
              color: '#FFFFFF',
              boxShadow: isRecording
                ? '0 0 25px rgba(239, 68, 68, 0.45)'
                : '0 8px 24px rgba(242, 101, 34, 0.35)',
              mb: 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: isRecording ? '#DC2626' : isConnecting ? '#E2E8F0' : '#d9581b',
                transform: 'scale(1.04)',
              },
              animation: isRecording ? 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite' : 'none',
              '@keyframes pulse-ring': {
                '0%': { transform: 'scale(0.96)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.6)' },
                '70%': { transform: 'scale(1)', boxShadow: '0 0 0 20px rgba(239, 68, 68, 0)' },
                '100%': { transform: 'scale(0.96)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
              },
            }}
          >
            {isRecording ? <StopIcon sx={{ fontSize: 38 }} /> : <MicIcon sx={{ fontSize: 38 }} />}
          </IconButton>

          {/* Real-time speech status line */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: isRecording ? '#EF4444' : '#64748B', fontWeight: 600, fontSize: '0.8rem', mb: 2.5 }}>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: isRecording ? '#EF4444' : '#22C55E',
                animation: isRecording ? 'pulse 1.5s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(0.9)', opacity: 0.7 },
                  '50%': { transform: 'scale(1.2)', opacity: 1 },
                  '100%': { transform: 'scale(0.9)', opacity: 0.7 },
                },
              }}
            />
            {isConnecting ? "Connecting to audio engine..." : isRecording ? "Transcribing your spoken answer live..." : "Click microphone to record your response"}
          </Box>

          {/* Transcript Display Surface */}
          <TranscriptPanel
            value={displayValue}
            isRecording={isRecording}
            hasLiveText={Boolean(liveText)}
            onChange={handleTranscriptChange}
          />

          {/* Submission and Progression Action */}
          <Box sx={{ mt: 3.5, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleNextAction}
              disabled={loading || !currentQuestion || submitting}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : (currentQuestion?.is_last_question ? <SendIcon sx={{ fontSize: 18 }} /> : <NavigateNextIcon sx={{ fontSize: 20 }} />)}
              sx={{
                background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
                color: '#FFFFFF !important',
                px: 4.5,
                py: 1.3,
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(242, 101, 34, 0.35)',
                textTransform: 'none',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 6px 25px rgba(242, 101, 34, 0.45)',
                  transform: 'translateY(-1px)',
                },
                '&.Mui-disabled': {
                  background: '#E2E8F0',
                  color: '#94A3B8 !important',
                  boxShadow: 'none',
                },
              }}
            >
              {submitting ? 'Submitting...' : (currentQuestion?.is_last_question ? 'Submit Interview' : 'Next Question')}
            </Button>
          </Box>
        </Box>
      </Box>
      </Box>

    </Box>
  );
}
