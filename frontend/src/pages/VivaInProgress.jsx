import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, IconButton, Paper, Button, TextField, CircularProgress, Tooltip } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import CodeIcon from '@mui/icons-material/Code';
import TimerIcon from '@mui/icons-material/Timer';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import { vivaService } from '@/services/api';
import { globalState } from '@/store';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useFraudDetection } from '@/hooks/useFraudDetection';
import toast from 'react-hot-toast';

export default function VivaInProgress() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const sessionId = location.state?.sessionId;
  const moduleName = location.state?.moduleName || 'Module';
  const traineeName = location.state?.traineeName || 'Candidate';
  const durationMinutes = location.state?.durationMinutes || 15;

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Live countdown timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const totalSeconds = durationMinutes * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const timerMinutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const timerSecs = String(remainingSeconds % 60).padStart(2, '0');
  const timerExpired = remainingSeconds <= 0;
  const timerWarning = remainingSeconds <= 120 && remainingSeconds > 0; // last 2 min

  // Fraud detection runs in background
  const isEndingRef = useRef(false);
  const { detectorStatus } = useFraudDetection(sessionId, currentQuestion?.viva_question_id, isEndingRef);

  // Timer tick — counts up every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { 
    isRecording, 
    isConnecting,
    liveText,
    setLiveText, 
    finalText, 
    setFinalText, 
    toggleRecording, 
    stopRecording, 
    resetTranscript 
  } = useSpeechRecognition();
  
  const { speakQuestion, cancelSpeech } = useSpeechSynthesis();

  // Compute the display value for the text field.
  // Show finalText, and append liveText (greyed-out interim) separately.
  const displayValue = finalText + (liveText ? (finalText ? ' ' : '') + liveText : '');

  const fetchQuestion = useCallback(async () => {
    try {
      setLoading(true);
      const question = await vivaService.getNextQuestion(sessionId);
      setCurrentQuestion(question);
      resetTranscript();
    } catch (err) {
      console.error("Failed to fetch question:", err);
      toast.error("Failed to load the next question. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, resetTranscript]);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuestion();
    
    if (globalState.mediaStream && videoRef.current) {
      videoRef.current.srcObject = globalState.mediaStream;
    }
    
    return () => {
      cancelSpeech();
    };
  }, [sessionId, navigate, fetchQuestion, cancelSpeech]);

  useEffect(() => {
    if (currentQuestion && currentQuestion.text && !loading) {
      speakQuestion(currentQuestion.text);
    }
  }, [currentQuestion, loading, speakQuestion]);

  const handleNextAction = async () => {
    if (!currentQuestion || submitting) return;
    
    setSubmitting(true);
    cancelSpeech();

    try {
      // If still recording, stop and wait for it to fully close
      if (isRecording) {
        await stopRecording();
      }

      // Small delay to let React flush the final state from stopRecording
      await new Promise(r => setTimeout(r, 100));

      // Build the transcript from the React state as the source of truth
      const transcriptToSubmit = (displayValue || '').trim() || "(No answer provided)";
      
      await vivaService.submitAnswer(sessionId, currentQuestion.viva_question_id, transcriptToSubmit);
      
      if (currentQuestion.is_last_question) {
        if (globalState.mediaStream) {
          globalState.mediaStream.getTracks().forEach(track => track.stop());
          globalState.mediaStream = null;
        }

        // Exit fullscreen when the session finishes
        isEndingRef.current = true;
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

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F8FAFC', position: 'relative' }}>

      {/* Fixed Enterprise Top App Bar */}
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 40,
          height: 64,
          px: { xs: 2, md: 3.5 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Left: Branding & Candidate Badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <Box
            component="img"
            src="/ae-icon.png"
            alt="AutomationEdge"
            sx={{ height: 26, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
          />
          <Typography
            sx={{
              display: { xs: 'none', sm: 'block' },
              fontWeight: 700,
              fontFamily: 'Syne, sans-serif',
              fontSize: '1rem',
              color: '#0F172A',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Viva Copilot
          </Typography>

          <Box sx={{ display: { xs: 'none', sm: 'block' }, width: '1px', height: 20, bgcolor: '#E2E8F0', mx: 0.5, flexShrink: 0 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', px: 1.5, py: 0.5, borderRadius: 1.5, flexShrink: 0 }}>
            <PersonIcon sx={{ fontSize: 16, color: '#64748B' }} />
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 600, color: '#0F172A', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
              {traineeName}
            </Typography>
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.75, bgcolor: 'rgba(242, 101, 34, 0.08)', border: '1px solid rgba(242, 101, 34, 0.2)', px: 1.5, py: 0.5, borderRadius: 1.5, flexShrink: 0 }}>
            <CodeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 600, color: 'primary.main', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
              {moduleName}
            </Typography>
          </Box>
        </Box>

        {/* Right: Question Counter & Live Timer */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', fontFamily: 'DM Sans, sans-serif' }}>
            {currentQuestion ? `Question ${currentQuestion.current_question_index} of ${currentQuestion.total_questions}` : 'Loading...'}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.85,
              px: 1.75,
              py: 0.6,
              borderRadius: 2,
              bgcolor: timerExpired ? 'rgba(239, 68, 68, 0.1)' : timerWarning ? 'rgba(245, 158, 11, 0.1)' : '#F8FAFC',
              border: `1px solid ${timerExpired ? 'rgba(239, 68, 68, 0.3)' : timerWarning ? 'rgba(245, 158, 11, 0.3)' : '#E2E8F0'}`,
              color: timerExpired ? '#DC2626' : timerWarning ? '#D97706' : '#0F172A',
              transition: 'all 0.3s ease',
            }}
          >
            <TimerIcon sx={{ fontSize: 18 }} />
            <Typography
              sx={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.02em',
                lineHeight: 1,
              }}
            >
              {timerMinutes}:{timerSecs}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Floating Picture-In-Picture Webcam Viewfinder */}
      <Box
        sx={{
          position: 'fixed',
          top: 76,
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

      {/* Central Exam Workspace */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          pt: { xs: 14, sm: 12, md: 10 },
          pb: 6,
          maxWidth: 820,
          mx: 'auto',
          width: '100%',
          minHeight: '100vh',
          zIndex: 10,
        }}
      >
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
              fontFamily: 'Syne, sans-serif',
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: isRecording ? '#EF4444' : '#64748B', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.8rem', mb: 2.5 }}>
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
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              p: 2,
              borderRadius: 2.5,
              border: isRecording ? '1.5px solid #F26522' : '1px solid #E2E8F0',
              bgcolor: '#FFFFFF',
              boxShadow: isRecording ? '0 0 16px rgba(242, 101, 34, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
            }}
          >
            <TextField
              id="transcript-field"
              fullWidth
              multiline
              minRows={3}
              maxRows={7}
              variant="outlined"
              placeholder="Your spoken answer will appear here in real time..."
              value={displayValue}
              onChange={(e) => {
                setFinalText(e.target.value);
                setLiveText('');
              }}
              onPaste={(e) => {
                e.preventDefault();
                toast.error("Pasting is not allowed during the exam.");
              }}
              onCopy={(e) => {
                e.preventDefault();
              }}
              onCut={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                toast.error("Drag and drop is not allowed.");
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.975rem',
                  fontFamily: 'DM Sans, sans-serif',
                  color: '#0F172A',
                  lineHeight: 1.7,
                  '& fieldset': { border: 'none' },
                  p: 0.5,
                },
              }}
            />
            {isRecording && liveText && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 10,
                  right: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  bgcolor: 'rgba(239, 68, 68, 0.08)',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    bgcolor: '#EF4444',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                <Typography variant="caption" sx={{ color: '#EF4444', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                  listening...
                </Typography>
              </Box>
            )}
          </Paper>

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
                fontFamily: 'DM Sans, sans-serif',
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
  );
}
