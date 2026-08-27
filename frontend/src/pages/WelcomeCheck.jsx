import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Card, CardContent, Stack, Button, Chip, CircularProgress, Avatar } from '@mui/material';
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
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { vivaService } from '@/services/api';
import { globalState } from '@/store';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/AuthContext';

const StatusIcon = ({ status }) => {
  if (status === 'passed') return <CheckCircleIcon sx={{ color: '#16A34A', fontSize: 18 }} />;
  if (status === 'failed') return <CancelIcon sx={{ color: '#DC2626', fontSize: 18 }} />;
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ color: '#D97706' }}>
      <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '10px' }}>
        Verifying
      </Typography>
      <SyncIcon sx={{ fontSize: 14, animation: 'spin 2s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  useEffect(() => {
    // Only ask for camera/mic permissions if they actually have an assigned session
    if (!currentSession) return;

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
  }, [currentSession]);

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
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F8FAFC' }}>
      
      {/* Top Header with AutomationEdge Branding */}
      <Box
        component="header"
        sx={{
          width: '100%',
          px: { xs: 2.5, md: 4 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          position: 'sticky',
          top: 0,
          zIndex: 50,
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            component="img"
            src="/ae-icon.png"
            alt="AutomationEdge"
            sx={{ height: 26, width: 'auto', objectFit: 'contain' }}
          />
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                color: '#0F172A',
                fontWeight: 700,
                fontFamily: 'Syne, sans-serif',
                fontSize: '1.05rem',
                lineHeight: 1.1,
              }}
            >
              Viva Copilot
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#94A3B8',
                fontSize: '0.7rem',
                display: 'block',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
              }}
            >
              Candidate Assessment
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.8rem',
                fontWeight: 700,
                bgcolor: 'rgba(242, 101, 34, 0.1)',
                color: 'primary.main',
                border: '1px solid rgba(242, 101, 34, 0.25)',
              }}
            >
              {user?.username ? user.username.charAt(0).toUpperCase() : 'C'}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#0F172A',
                  lineHeight: 1.2,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {traineeName !== 'Loading...' ? traineeName : user?.username || 'Candidate'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#94A3B8',
                  fontSize: '0.7rem',
                  display: 'block',
                  lineHeight: 1.1,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Trainee
              </Typography>
            </Box>
          </Box>

          <Button
            size="small"
            onClick={handleLogout}
            startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
            sx={{
              color: '#64748B',
              borderColor: '#E2E8F0',
              border: '1px solid #E2E8F0',
              textTransform: 'none',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              fontSize: '0.8rem',
              borderRadius: 1.5,
              px: 1.5,
              py: 0.5,
              '&:hover': {
                borderColor: '#EF4444',
                color: '#EF4444',
                bgcolor: 'rgba(239, 68, 68, 0.04)',
              },
            }}
          >
            Sign Out
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2.5, md: 4 },
          width: '100%',
          maxWidth: 960,
          mx: 'auto',
        }}
      >
        {isFetchingSession ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 'auto', gap: 2 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
            <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
              Verifying active assessment schedule...
            </Typography>
          </Box>
        ) : !currentSession ? (
          <Box
            sx={{
              width: '100%',
              maxWidth: 480,
              bgcolor: '#FFFFFF',
              borderRadius: 2.5,
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                bgcolor: 'rgba(242, 101, 34, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.main',
                border: '1px solid rgba(242, 101, 34, 0.2)',
              }}
            >
              <FactCheckOutlinedIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0F172A', mb: 1 }}
              >
                No Session Assigned
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: '#64748B', lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif' }}
              >
                You do not have an active or pending viva assessment scheduled. Please contact your trainer or administrator to assign your module.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={fetchSession}
              startIcon={<SyncIcon sx={{ fontSize: 18 }} />}
              sx={{
                mt: 1,
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                py: 0.8,
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                fontSize: '0.875rem',
                borderColor: '#E2E8F0',
                color: '#0F172A',
                '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'rgba(242, 101, 34, 0.04)' },
              }}
            >
              Check Again
            </Button>
          </Box>
        ) : (
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            
            {/* Welcome Header */}
            <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Chip
                label={currentSession ? `${currentSession.module_name.toUpperCase()} ASSESSMENT` : 'VIVA ASSESSMENT'}
                size="small"
                sx={{
                  bgcolor: 'rgba(242, 101, 34, 0.08)',
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  letterSpacing: '0.04em',
                  borderRadius: 1.5,
                  border: '1px solid rgba(242, 101, 34, 0.2)',
                  px: 1,
                  py: 0.4,
                  fontFamily: 'DM Sans, sans-serif',
                  mb: 1,
                }}
              />
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.75rem', md: '2.25rem' },
                  color: '#0F172A',
                  fontFamily: 'Syne, sans-serif',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                Welcome, {traineeName}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#64748B',
                  fontSize: '0.95rem',
                  fontFamily: 'DM Sans, sans-serif',
                  maxWidth: 580,
                }}
              >
                Complete your system readiness check and review the exam protocol before launching your AI viva session.
              </Typography>
            </Box>

            {/* Cards Container */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, width: '100%' }}>
              
              {/* Instructions Card */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: 2.5,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  bgcolor: '#FFFFFF',
                }}
              >
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pb: 2, mb: 3, borderBottom: '1px solid #F1F5F9' }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(242, 101, 34, 0.08)', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '1.05rem', color: '#0F172A' }}>
                      Assessment Protocol
                    </Typography>
                  </Stack>
                  
                  <Stack spacing={3}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.75 }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
                        <TimerOutlinedIcon sx={{ fontSize: 16 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', mb: 0.25, fontFamily: 'DM Sans, sans-serif' }}>
                          Session Duration
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.5, fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif' }}>
                          Approximately {currentSession?.duration_minutes || '15'} minutes. Ensure you remain seated in a quiet, well-lit environment.
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.75 }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
                        <FormatListNumberedOutlinedIcon sx={{ fontSize: 16 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', mb: 0.25, fontFamily: 'DM Sans, sans-serif' }}>
                          Adaptive Questions
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.5, fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif' }}>
                          {currentSession?.total_questions ? `${currentSession.total_questions} questions` : 'Targeted questions'} covering core competencies in {currentSession?.module_name || 'your assigned module'}.
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.75 }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
                        <SmartToyOutlinedIcon sx={{ fontSize: 16 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', mb: 0.25, fontFamily: 'DM Sans, sans-serif' }}>
                          AI Voice Evaluation
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.5, fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif' }}>
                          Spoken responses are transcribed and graded for technical depth, terminology, and concept clarity.
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.75 }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
                        <ShieldOutlinedIcon sx={{ fontSize: 16 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', mb: 0.25, fontFamily: 'DM Sans, sans-serif' }}>
                          Integrity & Proctoring
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.5, fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif' }}>
                          Maintain camera presence and avoid tab switching. Live proctoring logs environmental integrity.
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* System Check Card */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: 2.5,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  bgcolor: '#FFFFFF',
                }}
              >
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2, borderBottom: '1px solid #F1F5F9' }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(242, 101, 34, 0.08)', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FactCheckOutlinedIcon sx={{ fontSize: 18 }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '1.05rem', color: '#0F172A' }}>
                        Hardware Readiness
                      </Typography>
                    </Stack>
                    <Chip
                      size="small"
                      label={`${readyCount}/5 Verified`}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        fontFamily: 'DM Sans, sans-serif',
                        bgcolor: isReady ? 'rgba(34, 197, 94, 0.08)' : 'rgba(242, 101, 34, 0.08)',
                        color: isReady ? '#16A34A' : '#F26522',
                        border: `1px solid ${isReady ? 'rgba(34, 197, 94, 0.25)' : 'rgba(242, 101, 34, 0.25)'}`,
                        borderRadius: 1.5,
                      }}
                    />
                  </Box>

                  {/* Live Video Preview Box */}
                  <Box
                    sx={{
                      width: '100%',
                      height: 150,
                      bgcolor: '#0F172A',
                      borderRadius: 2,
                      overflow: 'hidden',
                      position: 'relative',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <Box
                      component="video"
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {stream ? (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          bgcolor: 'rgba(15, 23, 42, 0.75)',
                          backdropFilter: 'blur(4px)',
                          px: 1,
                          py: 0.3,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                        }}
                      >
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
                        <Typography variant="caption" sx={{ color: '#FFFFFF', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                          FEED ACTIVE
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
                          Requesting camera & microphone access...
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  {/* Checklist rows */}
                  <Stack spacing={1}>
                    {[
                      { label: 'Camera Sensor', icon: <VideocamOutlinedIcon sx={{ fontSize: 16 }} />, status: checks.camera },
                      { label: 'Microphone Input', icon: <MicNoneOutlinedIcon sx={{ fontSize: 16 }} />, status: checks.mic },
                      { label: 'Audio Speaker', icon: <VolumeUpOutlinedIcon sx={{ fontSize: 16 }} />, status: checks.speaker },
                      { label: 'Network Connection', icon: <WifiOutlinedIcon sx={{ fontSize: 16 }} />, status: checks.network },
                      { label: 'Browser Compatibility', icon: <PublicOutlinedIcon sx={{ fontSize: 16 }} />, status: checks.browser },
                    ].map((item) => (
                      <Box
                        key={item.label}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          px: 1.5,
                          py: 0.85,
                          borderRadius: 1.5,
                          bgcolor: '#F8FAFC',
                          border: '1px solid #F1F5F9',
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <Box sx={{ color: '#64748B', display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
                          <Typography variant="body2" sx={{ color: '#0F172A', fontSize: '0.825rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                            {item.label}
                          </Typography>
                        </Stack>
                        <StatusIcon status={item.status} />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

            </Box>

            {/* CTA */}
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1, gap: 1.5 }}>
              <Button
                variant="contained"
                disabled={!isReady || isStartingSession}
                onClick={handleStart}
                endIcon={!isStartingSession && <ArrowForwardIcon sx={{ fontSize: 18 }} />}
                sx={{
                  background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
                  color: '#FFFFFF !important',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  fontFamily: 'DM Sans, sans-serif',
                  px: 5,
                  py: 1.35,
                  borderRadius: 2,
                  boxShadow: '0 4px 20px rgba(242, 101, 34, 0.35)',
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
                {isStartingSession ? (
                  <>
                    <CircularProgress size={18} sx={{ color: 'inherit', mr: 1.5 }} />
                    Preparing Interview Environment...
                  </>
                ) : (
                  'Accept Guidelines & Begin Viva'
                )}
              </Button>
              {!isReady && (
                <Typography variant="caption" sx={{ color: '#EF4444', fontSize: '0.8rem', fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}>
                  Please allow camera and microphone permissions in your browser to proceed.
                </Typography>
              )}
            </Box>

          </Box>
        )}
      </Box>
    </Box>
  );
}
