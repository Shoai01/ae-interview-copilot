import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Card, CardContent, Stack, Button, Chip, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import FormatListNumberedOutlinedIcon from '@mui/icons-material/FormatListNumberedOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import WifiOutlinedIcon from '@mui/icons-material/WifiOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SyncIcon from '@mui/icons-material/Sync';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LogoutIcon from '@mui/icons-material/Logout';
import { vivaService } from '@/services/api';
import { globalState } from '@/store';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/AuthContext';

const StatusIcon = ({ status }) => {
  if (status === 'passed') return <CheckCircleIcon sx={{ color: 'success.main', fontSize: '20px' }} />;
  if (status === 'failed') return <CancelIcon sx={{ color: 'error.main', fontSize: '20px' }} />;
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'warning.main' }}>
      <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Checking</Typography>
      <SyncIcon sx={{ fontSize: '16px', animation: 'spin 2s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
    </Stack>
  );
};

export default function WelcomeCheck() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const { user, logout } = useAuth();

  const [checks, setChecks] = useState({
    camera: 'checking',
    mic: 'checking',
    speaker: 'checking', 
    network: navigator.onLine ? 'passed' : 'failed',
    browser: 'passed'
  });

  const [stream, setStream] = useState(null);
  const [traineeName, setTraineeName] = useState("Loading...");
  const [currentSession, setCurrentSession] = useState(null);
  const [isFetchingSession, setIsFetchingSession] = useState(true);

  const fetchSession = async () => {
    setIsFetchingSession(true);
    try {
      const session = await vivaService.getCurrentSession();
      setCurrentSession(session);
    } catch (err) {
      console.error("Failed to fetch current session:", err);
      setCurrentSession(null);
    } finally {
      setIsFetchingSession(false);
    }
  };

  useEffect(() => {
    // Fetch Trainee Details
    const fetchTrainee = async () => {
      try {
        if (user?.id) {
            const trainee = await vivaService.getTrainee(user.id);
            setTraineeName(trainee.name || "Candidate");
        }
      } catch (err) {
        console.error("Failed to fetch trainee:", err);
        setTraineeName("Candidate");
      }
    };
    fetchTrainee();
    fetchSession();

    // Network listener
    const handleOnline = () => setChecks(prev => ({ ...prev, network: 'passed' }));
    const handleOffline = () => setChecks(prev => ({ ...prev, network: 'failed' }));
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let activeStream = null;

    const setupMedia = async () => {
      try {
        if (!globalState.mediaStream) {
          globalState.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        }
        activeStream = globalState.mediaStream;
        setStream(activeStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }

        setChecks(prev => ({ 
          ...prev, 
          camera: 'passed', 
          mic: 'passed', 
          speaker: 'passed' 
        }));
      } catch (err) {
        console.error("Media access error:", err);
        setChecks(prev => ({ 
          ...prev, 
          camera: 'failed', 
          mic: 'failed', 
          speaker: 'failed' 
        }));
      }
    };

    setupMedia();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const [isStartingSession, setIsStartingSession] = useState(false);

  const handleStart = async () => {
    try {
      setIsStartingSession(true);
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Some browsers may still block — proceed anyway
      }

      // Start session using the token (backend determines module and trainee)
      const session = await vivaService.startSession();
      
      // Pass full session data to the interview page
      navigate('/interview', { 
        state: { 
          sessionId: session.id,
          moduleName: session.module_name,
          traineeName: session.trainee_name,
          durationMinutes: session.duration_minutes,
          totalQuestions: session.total_questions
        } 
      });
    } catch (err) {
      console.error("Failed to create session:", err);
      toast.error(err.response?.data?.detail || "Failed to start session");
      setIsStartingSession(false);
    }
  };

  const isReady = Object.values(checks).every(status => status === 'passed');
  const readyCount = Object.values(checks).filter(status => status === 'passed').length;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };


  return (
    <Box sx={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box component="header" sx={{ width: '100%', px: 4, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 50, bgcolor: 'background.default' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', color: 'text.primary', fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>
          Viva Copilot<Typography component="span" variant="h6" color="primary.main" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>.</Typography>
        </Typography>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={handleLogout}
          startIcon={<LogoutIcon fontSize="small" />}
          sx={{ 
            color: 'text.secondary', 
            borderColor: 'rgba(0,0,0,0.12)', 
            textTransform: 'none', 
            fontWeight: 500,
            '&:hover': { borderColor: 'rgba(0,0,0,0.24)', bgcolor: 'rgba(0,0,0,0.02)' }
          }}
        >
          Sign Out
        </Button>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', p: { xs: 2, md: 4 }, width: '100%', maxWidth: 1440, mx: 'auto' }}>
        
        {isFetchingSession ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 'auto', gap: 2 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">Checking for active sessions...</Typography>
          </Box>
        ) : !currentSession ? (
          <Box sx={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', my: 'auto', textAlign: 'center' }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(242,101,34,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main', mb: 1 }}>
              <FactCheckOutlinedIcon sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>No Session Assigned</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              You currently do not have any active or pending interview sessions. Please wait for your trainer or administrator to assign a module to your account.
            </Typography>
            <Button 
              variant="outlined" 
              onClick={fetchSession}
              startIcon={<SyncIcon />}
              sx={{ mt: 2, borderRadius: 2, textTransform: 'none', px: 4 }}
            >
              Check Again
            </Button>
          </Box>
        ) : (
          <Box sx={{ width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', my: 'auto' }}>
          
          {/* Welcome Header */}
          <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={currentSession ? `${currentSession.module_name.toUpperCase()} MODULE` : 'LOADING...'}
              size="small"
              sx={{ 
                bgcolor: 'rgba(242, 101, 34, 0.1)', 
                color: 'primary.main', 
                fontWeight: 600, 
                fontSize: '11px',
                letterSpacing: '0.05em', 
                mb: 1.5,
                borderRadius: '16px',
                px: 1
              }} 
            />
            <Typography variant="h2" sx={{ fontWeight: 700, fontSize: { xs: '32px', md: '48px' }, mb: 1, color: 'text.primary' }}>
              Welcome, {traineeName}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '18px' }}>
              Let's get you ready for your AI-powered evaluation.
            </Typography>
          </Box>

          {/* Cards Container */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, width: '100%' }}>
            
            {/* Instructions Card */}
            <Card sx={{ flex: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0px 4px 20px rgba(0,0,0,0.02)', p: 1 }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pb: 2, mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <InfoOutlinedIcon sx={{ color: '#f26522' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>Viva Details</Typography>
                </Stack>
                
                <Stack spacing={4}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <TimerOutlinedIcon sx={{ color: 'primary.main', fontSize: '22px' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>Duration</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>Approximately {currentSession?.duration_minutes || '15'} minutes. Ensure you have uninterrupted time.</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <FormatListNumberedOutlinedIcon sx={{ color: 'primary.main', fontSize: '22px' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>Questions</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{currentSession?.total_questions ? `${currentSession.total_questions} questions` : 'A series of questions'} focusing on {currentSession?.module_name ? `the ${currentSession.module_name} module` : 'your assigned module'}.</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <SmartToyOutlinedIcon sx={{ color: 'primary.main', fontSize: '22px' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>AI Evaluation</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>Responses are analyzed in real-time for technical accuracy and clarity.</Typography>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* System Check Card */}
            <Card sx={{ flex: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0px 4px 20px rgba(0,0,0,0.02)', p: 1 }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <FactCheckOutlinedIcon sx={{ color: '#f26522' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>System Check</Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>{readyCount}/5 Ready</Typography>
                </Box>

                {/* Live Video Preview Box */}
                <Box sx={{ width: '100%', height: 160, bgcolor: '#000', borderRadius: 4, overflow: 'hidden', position: 'relative', boxShadow: 'inset 0px 4px 20px rgba(0,0,0,0.5)' }}>
                  <Box
                    component="video"
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {!stream && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Allow camera access...</Typography>
                    </Box>
                  )}
                </Box>
                
                <Stack spacing={0.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <VideocamOutlinedIcon sx={{ color: 'text.secondary', fontSize: '18px' }} />
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>Camera</Typography>
                    </Stack>
                    <StatusIcon status={checks.camera} />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <MicNoneOutlinedIcon sx={{ color: 'text.secondary', fontSize: '18px' }} />
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>Microphone</Typography>
                    </Stack>
                    <StatusIcon status={checks.mic} />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <VolumeUpOutlinedIcon sx={{ color: 'text.secondary', fontSize: '18px' }} />
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>Speaker</Typography>
                    </Stack>
                    <StatusIcon status={checks.speaker} />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <WifiOutlinedIcon sx={{ color: 'text.secondary', fontSize: '18px' }} />
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>Internet</Typography>
                    </Stack>
                    <StatusIcon status={checks.network} />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <PublicOutlinedIcon sx={{ color: 'text.secondary', fontSize: '18px' }} />
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>Browser</Typography>
                    </Stack>
                    <StatusIcon status={checks.browser} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

          </Box>

          {/* CTA */}
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2, gap: 1.5 }}>
            <Button 
              variant="contained" 
              disabled={!isReady || isStartingSession}
              sx={{ 
                bgcolor: 'primary.main', 
                color: '#fff',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '16px',
                px: 5, 
                py: 1.5, 
                borderRadius: 3,
                boxShadow: '0px 8px 24px rgba(242, 101, 34, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': { bgcolor: 'primary.dark', boxShadow: '0px 12px 28px rgba(242, 101, 34, 0.4)', transform: 'translateY(-2px)' },
                '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.26)', boxShadow: 'none' }
              }}
              endIcon={!isStartingSession && <ArrowForwardIcon />}
              onClick={handleStart}
            >
              {isStartingSession ? (
                <>
                  <CircularProgress size={20} sx={{ color: 'inherit', mr: 1.5 }} />
                  AI is preparing your interview questions...
                </>
              ) : (
                "I Accept & Start Viva"
              )}
            </Button>
            {!isReady && (
              <Typography variant="body2" sx={{ color: 'error.main', fontSize: '13px', fontWeight: 500 }}>
                Please allow camera and microphone access to proceed.
              </Typography>
            )}
          </Box>

          </Box>
        )}
      </Box>
    </Box>
  );
}
