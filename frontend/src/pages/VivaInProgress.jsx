import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, IconButton, Paper, Button, TextField, CircularProgress } from '@mui/material';
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
  const { detectorStatus } = useFraudDetection(sessionId, currentQuestion?.viva_question_id);

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
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        // Trigger AI evaluation in the background before navigating
        vivaService.evaluateSession(sessionId).catch(e => console.error("Evaluation failed", e));
        navigate('/complete', { state: { sessionId } });
      } else {
        fetchQuestion();
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', position: 'relative' }}>

      <Box component="header" sx={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 40, px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
        
        <Paper elevation={0} sx={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 2, pointerEvents: 'auto', backdropFilter: 'blur(12px)', bgcolor: 'rgba(255,255,255,0.9)' }}>
          <Box sx={{ bgcolor: 'rgba(0,0,0,0.04)', px: 1.5, py: 0.5, borderRadius: 4, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonIcon fontSize="small" />
            <Typography variant="overline" sx={{ letterSpacing: 0, fontSize: '14px', textTransform: 'none', fontWeight: 600 }}>{traineeName}</Typography>
          </Box>
          <Box sx={{ bgcolor: 'rgba(0,0,0,0.04)', px: 1.5, py: 0.5, borderRadius: 4, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CodeIcon fontSize="small" />
            <Typography variant="overline" sx={{ letterSpacing: 0, fontSize: '14px', textTransform: 'none' }}>{moduleName}</Typography>
          </Box>
          <Typography variant="body2" sx={{ borderLeft: '1px solid rgba(0,0,0,0.1)', pl: 2 }}>
            {currentQuestion ? `Question ${currentQuestion.current_question_index} of ${currentQuestion.total_questions}` : 'Loading...'}
          </Typography>
          <Typography 
            variant="h4" 
            sx={{ 
              display: 'flex', alignItems: 'center', gap: 1, 
              borderLeft: '1px solid rgba(0,0,0,0.1)', pl: 2,
              color: timerExpired ? 'error.main' : timerWarning ? 'warning.main' : 'primary.main',
              animation: timerWarning ? 'pulse 2s infinite' : 'none'
            }}
          >
            <TimerIcon />
            {timerMinutes}:{timerSecs}
          </Typography>
        </Paper>

        <Box sx={{ 
          width: { xs: 120, sm: 180, md: 240 }, height: { xs: 90, sm: 135, md: 180 }, 
          borderRadius: 4, 
          border: '1px solid rgba(255,255,255,0.4)', 
          overflow: 'hidden', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)', 
          pointerEvents: 'auto', 
          position: 'relative', 
          bgcolor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Box
            component="video"
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            aria-label="Video stream"
          />
          <Box sx={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', px: 1, py: 0.5, borderRadius: 2 }}>
            <Box sx={{ width: 8, height: 8, bgcolor: 'success.main', borderRadius: '50%', boxShadow: '0 0 8px success.main' }} />
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, fontSize: '10px', letterSpacing: 0.5 }}>LIVE</Typography>
          </Box>
        </Box>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', px: 3, pt: { xs: 16, sm: 14, md: 12 }, pb: 6, maxWidth: 1440, mx: 'auto', width: '100%', zIndex: 10 }}>
        
        <Box sx={{ maxWidth: 800, textAlign: 'center', mb: 6, mt: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, cursor: 'pointer' }} onClick={() => currentQuestion && speakQuestion(currentQuestion.text)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && currentQuestion && speakQuestion(currentQuestion.text)}>
            <VolumeUpIcon sx={{ color: 'text.secondary', fontSize: 32, opacity: 0.7, '&:hover': { opacity: 1, color: 'primary.main' } }} />
          </Box>
          <Typography variant="h1" sx={{ fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' }, letterSpacing: '-0.02em', mb: 4, fontFamily: '"Georgia", "Merriweather", serif', fontWeight: 500 }}>
            {loading ? "Loading..." : currentQuestion ? currentQuestion.text : "Session Complete"}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: 32, opacity: isRecording ? 0.8 : 0.2 }}>
            {[0, 0.1, 0.2, 0.3, 0.4].map((delay, i) => (
              <Box key={i} sx={{ 
                width: 4, 
                height: 8, 
                bgcolor: 'primary.main', 
                borderRadius: 4, 
                animation: isRecording ? `pulse-wave 1.2s infinite ease-in-out alternate` : 'none', 
                animationDelay: `${delay}s`,
                '@keyframes pulse-wave': {
                  '0%': { height: '8px' },
                  '100%': { height: '24px' }
                }
              }} />
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 700, mb: 'auto' }}>
          
          <IconButton aria-label="action" 
            color={isRecording ? "error" : "primary"} 
            onClick={() => {
              if (!isRecording) cancelSpeech();
              toggleRecording();
            }}
            disabled={isConnecting || submitting}
            sx={{ 
              width: 96, 
              height: 96, 
              bgcolor: isRecording ? 'error.light' : (isConnecting ? 'grey.300' : 'primary.light'), 
              color: isRecording ? 'error.dark' : (isConnecting ? 'grey.500' : 'primary.dark'),
              boxShadow: 2,
              mb: 4,
              '&:hover': { 
                bgcolor: isConnecting ? 'grey.300' : (isRecording ? 'error.main' : 'primary.main'), 
                color: isConnecting ? 'grey.500' : 'white' 
              },
              animation: isRecording ? 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite' : 'none',
              '@keyframes pulse-ring': {
                '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(242, 101, 34, 0.7)' },
                '70%': { transform: 'scale(1)', boxShadow: '0 0 0 20px rgba(242, 101, 34, 0)' },
                '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(242, 101, 34, 0)' }
              }
            }}
          >
            {isRecording ? <StopIcon sx={{ fontSize: 40 }} /> : <MicIcon sx={{ fontSize: 40 }} />}
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500, fontSize: '12px', mb: 2 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isRecording ? 'error.main' : 'primary.main', animation: isRecording ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none' }} />
            {isConnecting ? "Connecting to AI..." : (isRecording ? "Live Transcribing with Deepgram..." : "Click Mic to Answer")}
          </Box>

          <Paper elevation={0} sx={{ 
            width: '100%', 
            p: 1, 
            borderRadius: 3, 
            border: isRecording ? '1px solid rgba(242, 101, 34, 0.3)' : '1px solid rgba(0,0,0,0.08)', 
            bgcolor: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)',
            position: 'relative',
            transition: 'border-color 0.3s ease'
          }}>
            <TextField
              id="transcript-field"
              fullWidth
              multiline
              minRows={3}
              maxRows={8}
              variant="outlined"
              placeholder="Your answer will magically appear here..."
              value={displayValue}
              onChange={(e) => {
                // When user edits, treat it all as finalText and clear liveText
                setFinalText(e.target.value);
                setLiveText('');
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '18px',
                  color: 'text.primary',
                  lineHeight: 1.8,
                  '& fieldset': { border: 'none' },
                }
              }}
            />
            {isRecording && liveText && (
              <Box sx={{ 
                position: 'absolute', 
                bottom: 8, 
                right: 12, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5 
              }}>
                <Box sx={{ 
                  width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main',
                  animation: 'pulse 1.5s infinite'
                }} />
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '11px' }}>
                  listening...
                </Typography>
              </Box>
            )}
          </Paper>

          <Box sx={{ mt: 4, width: '100%', display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              sx={{ px: 4, py: 1.5, fontSize: '16px', fontWeight: 600, borderRadius: 2, boxShadow: 'none' }}
              onClick={handleNextAction}
              disabled={loading || !currentQuestion || submitting}
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : (currentQuestion?.is_last_question ? <SendIcon /> : <NavigateNextIcon />)}
            >
              {submitting ? 'Submitting...' : (currentQuestion?.is_last_question ? 'Submit Interview' : 'Next Question')}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ===== FRAUD DETECTION MONITOR (temp dev panel) ===== */}


    </Box>
  );
}
