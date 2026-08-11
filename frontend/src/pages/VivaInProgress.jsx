import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, IconButton, Paper, Button, TextField } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import CodeIcon from '@mui/icons-material/Code';
import TimerIcon from '@mui/icons-material/Timer';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { vivaService } from '../services/api';
import { globalState } from '../store';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

export default function VivaInProgress() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const sessionId = location.state?.sessionId;

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);

  const { 
    isRecording, 
    liveText, 
    finalText, 
    setFinalText, 
    toggleRecording, 
    stopRecording, 
    resetTranscript 
  } = useSpeechRecognition();
  
  const { speakQuestion, cancelSpeech } = useSpeechSynthesis();

  const fetchQuestion = async () => {
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
  };

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    fetchQuestion();
    
    if (globalState.mediaStream && videoRef.current) {
      videoRef.current.srcObject = globalState.mediaStream;
    }
    
    return () => {
      cancelSpeech();
    };
  }, [sessionId, navigate]);

  useEffect(() => {
    if (currentQuestion && currentQuestion.text && !loading) {
      speakQuestion(currentQuestion.text);
    }
  }, [currentQuestion, loading, speakQuestion]);

  const handleNextAction = async () => {
    if (!currentQuestion) return;
    
    // Stop recording if user clicked next while still recording
    if (isRecording) {
      stopRecording();
    }
    cancelSpeech();

    try {
      setLoading(true);
      // Combine finalized text and any lingering live text
      const transcriptToSubmit = (finalText + (liveText ? ' ' + liveText : '')).trim() || "(No answer provided)";
      await vivaService.submitAnswer(sessionId, currentQuestion.viva_question_id, transcriptToSubmit);
      
      if (currentQuestion.is_last_question) {
        if (globalState.mediaStream) {
          globalState.mediaStream.getTracks().forEach(track => track.stop());
          globalState.mediaStream = null;
        }
        navigate('/complete');
      } else {
        fetchQuestion();
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', position: 'relative', overflow: 'hidden' }}>
      
      <Box sx={{ position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%', bgcolor: '#dce9ff', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.5, zIndex: 0 }} />
      <Box sx={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '40%', height: '40%', bgcolor: '#d5e3fc', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.4, zIndex: 0 }} />

      <Box component="header" sx={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 40, px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
        
        <Paper elevation={0} sx={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 2, pointerEvents: 'auto', backdropFilter: 'blur(12px)', bgcolor: 'rgba(255,255,255,0.9)' }}>
          <Box sx={{ bgcolor: 'rgba(0,0,0,0.04)', px: 1.5, py: 0.5, borderRadius: 4, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CodeIcon fontSize="small" />
            <Typography variant="overline" sx={{ letterSpacing: 0, fontSize: '14px', textTransform: 'none' }}>Developer</Typography>
          </Box>
          <Typography variant="body2" sx={{ borderLeft: '1px solid rgba(0,0,0,0.1)', pl: 2 }}>
            {currentQuestion ? `Question ${currentQuestion.current_question_index} of ${currentQuestion.total_questions}` : 'Loading...'}
          </Typography>
          <Typography variant="h4" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, borderLeft: '1px solid rgba(0,0,0,0.1)', pl: 2 }}>
            <TimerIcon />
            08:45
          </Typography>
        </Paper>

        <Box sx={{ 
          width: 200, 
          height: 200, 
          borderRadius: 4, 
          border: '2px solid rgba(0,0,0,0.08)', 
          overflow: 'hidden', 
          boxShadow: 3, 
          pointerEvents: 'auto', 
          position: 'relative', 
          bgcolor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <Box sx={{ position: 'absolute', bottom: 12, right: 12, width: 14, height: 14, bgcolor: '#10b981', borderRadius: '50%', border: '2px solid white', boxShadow: 1 }} />
        </Box>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3, pt: 12, pb: 6, maxWidth: 1440, mx: 'auto', width: '100%', zIndex: 10 }}>
        
        <Box sx={{ maxWidth: 800, textAlign: 'center', mb: 6 }}>
          <Box 
            sx={{ display: 'flex', justifyContent: 'center', mb: 2, cursor: 'pointer' }}
            onClick={() => currentQuestion && speakQuestion(currentQuestion.text)}
          >
            <VolumeUpIcon sx={{ color: 'text.secondary', fontSize: 32, opacity: 0.7, '&:hover': { opacity: 1, color: 'primary.main' } }} />
          </Box>
          <Typography variant="h1" sx={{ letterSpacing: '-0.02em', mb: 4 }}>
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

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 700 }}>
          
          <IconButton 
            color={isRecording ? "error" : "primary"} 
            onClick={toggleRecording}
            sx={{ 
              width: 96, 
              height: 96, 
              bgcolor: isRecording ? 'error.light' : 'primary.light', 
              color: isRecording ? 'error.dark' : 'primary.dark',
              boxShadow: 2,
              mb: 4,
              '&:hover': { bgcolor: isRecording ? 'error.main' : 'primary.main', color: 'white' },
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
            {isRecording ? "Live Transcribing with Deepgram..." : "Click Mic to Answer"}
          </Box>

          <Paper elevation={0} sx={{ 
            width: '100%', 
            p: 1, 
            borderRadius: 3, 
            border: '1px solid rgba(0,0,0,0.08)', 
            bgcolor: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)',
            position: 'relative'
          }}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={8}
              variant="outlined"
              placeholder="Your answer will magically appear here..."
              value={finalText + (liveText ? (finalText ? ' ' : '') + liveText : '')}
              onChange={(e) => setFinalText(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '18px',
                  color: '#594138',
                  lineHeight: 1.8,
                  '& fieldset': { border: 'none' },
                }
              }}
            />
          </Paper>

          <Box sx={{ mt: 4, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              sx={{ px: 4, py: 1.5, fontSize: '16px', fontWeight: 600, borderRadius: 2, boxShadow: 'none' }}
              onClick={handleNextAction}
              disabled={loading || !currentQuestion || isRecording}
            >
              {currentQuestion?.is_last_question ? 'Submit Interview' : 'Next Question'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
