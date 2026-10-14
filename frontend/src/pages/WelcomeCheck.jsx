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
import FaceRetouchingNaturalOutlinedIcon from '@mui/icons-material/FaceRetouchingNaturalOutlined';
import { vivaService } from '@/services/api';
import { AUDIO_CONSTRAINTS } from '@/store';
import { ensureExamStream, releaseAllMedia } from '@/utils/mediaStreams';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/AuthContext';
import FaceReferenceCapture from '@/components/FaceReferenceCapture';

/**
 * Real feature-support check instead of a hardcoded 'passed' — verifies the
 * three browser APIs the exam actually depends on: MediaRecorder (archival
 * audio), AudioWorklet (live PCM tap for Deepgram), and the Fullscreen API
 * (proctoring).
 */
function checkBrowserCompatibility() {
  const hasMediaRecorder = typeof window.MediaRecorder !== 'undefined';
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const hasAudioWorklet = !!AudioCtx && 'audioWorklet' in AudioCtx.prototype;
  const hasFullscreen = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  return hasMediaRecorder && hasAudioWorklet && hasFullscreen;
}

/**
 * Real speaker check instead of assuming 'passed' whenever getUserMedia
 * succeeds (mic/camera access says nothing about audio output). Confirms at
 * least one audio output device is present. Device labels are only
 * populated after a media permission has been granted, so call this after
 * getUserMedia resolves.
 */
async function checkSpeakerAvailable() {
  if (!navigator.mediaDevices?.enumerateDevices) return true; // can't verify — don't block on it
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(d => d.kind === 'audiooutput');
  } catch {
    return true; // enumeration failing isn't evidence of no speaker — don't false-fail
  }
}

const StatusIcon = ({ status }) => {
  if (status === 'passed') return <CheckCircleIcon sx={{ color: '#16A34A', fontSize: 18 }} />;
  if (status === 'failed') return <CancelIcon sx={{ color: '#DC2626', fontSize: 18 }} />;
  if (status === 'pending') {
    // Waiting on the candidate (e.g. the identity photo), not on an automatic check.
    return (
      <Typography variant="caption" sx={{ color: '#F26522', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '10px' }}>
        Required
      </Typography>
    );
  }
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ color: '#D97706' }}>
      <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '10px' }}>
        Verifying
      </Typography>
      <SyncIcon sx={{ fontSize: 14, animation: 'spin 2s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
    </Stack>
  );
};

const CARD_SX = {
  borderRadius: 2.5,
  border: '1px solid #E2E8F0',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  bgcolor: '#FFFFFF',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
};

const CARD_CONTENT_SX = {
  p: 2.25,
  '&:last-child': { pb: 2.25 },
  display: 'flex',
  flexDirection: 'column',
  gap: 1.5,
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
};

function CardHeading({ icon, title, right }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pb: 1.5, borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
        <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: 'rgba(242, 101, 34, 0.08)', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </Box>
        <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
          {title}
        </Typography>
      </Stack>
      {right}
    </Box>
  );
}

function StatusChip({ ok, label }) {
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        fontWeight: 700,
        fontSize: '0.72rem',
        flexShrink: 0,
        bgcolor: ok ? 'rgba(34, 197, 94, 0.08)' : 'rgba(242, 101, 34, 0.08)',
        color: ok ? '#16A34A' : '#F26522',
        border: `1px solid ${ok ? 'rgba(34, 197, 94, 0.25)' : 'rgba(242, 101, 34, 0.25)'}`,
        borderRadius: 1.5,
      }}
    />
  );
}

function ProtocolRow({ icon, color, title, children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
      <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>{title}</Typography>
        <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.45, fontSize: '0.8rem' }}>{children}</Typography>
      </Box>
    </Box>
  );
}

export default function WelcomeCheck() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const proceedingToExamRef = useRef(false);
  const { user, logout } = useAuth();

  // Camera/mic/speaker are always re-verified fresh on every mount (see the
  // setupMedia effect below) — nothing here is restored from storage and
  // trusted verbatim, since a passed check from a prior visit says nothing
  // about whether the camera is still connected or permission still holds.
  const getInitialChecks = () => ({
    camera: 'checking',
    mic: 'checking',
    speaker: 'checking',
    network: navigator.onLine ? 'passed' : 'failed',
    browser: checkBrowserCompatibility() ? 'passed' : 'failed',
  });

  const [checks, setChecks] = useState(getInitialChecks);

  const [stream, setStream] = useState(null);
  const [traineeName, setTraineeName] = useState("Loading...");
  const [currentSession, setCurrentSession] = useState(null);
  const [isFetchingSession, setIsFetchingSession] = useState(true);

  // Identity photo: taken here, uploaded as the session's reference once the
  // session exists. `faceRequired` is false when the feature is off or the
  // face service is down, so neither can lock a candidate out of the exam.
  const [faceConfig, setFaceConfig] = useState(null);
  const [facePhoto, setFacePhoto] = useState(null);
  const [faceUnavailable, setFaceUnavailable] = useState(false);
  const faceRequired = Boolean(faceConfig?.enabled) && !faceUnavailable;

  useEffect(() => {
    vivaService.getFaceConfig().then(setFaceConfig).catch(() => setFaceConfig(null));
  }, []);

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
        // One shared request: reuses the existing stream only while its tracks are still
        // live (a stale reference after a revoked permission or unplugged device must not
        // short-circuit real verification), and never opens a second one alongside it.
        activeStream = await ensureExamStream({ video: true, audio: AUDIO_CONSTRAINTS });
        setStream(activeStream);

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }

        const speakerOk = await checkSpeakerAvailable();

        setChecks({
          camera: 'passed',
          mic: 'passed',
          speaker: speakerOk ? 'passed' : 'failed',
          network: navigator.onLine ? 'passed' : 'failed',
          browser: checkBrowserCompatibility() ? 'passed' : 'failed',
        });
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

  // The plain preview only exists while the identity-photo step is off;
  // (re)attach the stream whenever it mounts.
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream, faceRequired]);

  const [isStartingSession, setIsStartingSession] = useState(false);

  // Leaving this page for anywhere but the exam (Back button, a different route) must not
  // leave the camera and microphone running; the exam page takes over the stream itself.
  useEffect(
    () => () => {
      if (!proceedingToExamRef.current) releaseAllMedia();
    },
    []
  );

  const handleStart = async () => {
    try {
      setIsStartingSession(true);
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Some browsers may still block — proceed anyway, but the candidate
        // needs to know full-screen proctoring won't be active, rather than
        // this failing completely silently.
        toast.error("Couldn't enter full-screen mode. Full-screen proctoring will be unavailable for this session.", { duration: 6000 });
      }

      // Start session using the token (backend determines module and trainee)
      const session = await vivaService.startSession();

      // Lock in the identity photo as this session's reference. If it fails here
      // the interview page asks for a new one, so this never blocks the start.
      if (faceRequired && facePhoto && !session.face_reference_set) {
        try {
          await vivaService.uploadFaceReference(session.id, facePhoto);
        } catch (err) {
          console.warn("Reference photo upload failed; the interview page will ask again:", err);
        }
      }
      
      // Pass full session data to the interview page
      proceedingToExamRef.current = true;
      navigate('/interview', { 
        state: { 
          sessionId: session.id,
          moduleName: session.module_name,
          traineeName: session.trainee_name,
          durationMinutes: session.duration_minutes,
          totalQuestions: session.total_questions,
          startTime: session.start_time
        } 
      });
    } catch (err) {
      console.error("Failed to create session:", err);
      toast.error(err.response?.data?.detail || "Failed to start session");
      setIsStartingSession(false);
    }
  };

  const hardwareReady = Object.values(checks).every(status => status === 'passed');
  const isReady = hardwareReady && (!faceRequired || Boolean(facePhoto));
  const readyCount = Object.values(checks).filter(status => status === 'passed').length + (faceRequired && facePhoto ? 1 : 0);
  const totalChecks = Object.keys(checks).length + (faceRequired ? 1 : 0);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };


  return (
    <Box sx={{ height: { md: '100dvh' }, minHeight: { xs: '100dvh', md: 0 }, overflow: { md: 'hidden' }, display: 'flex', flexDirection: 'column', bgcolor: '#F8FAFC' }}>
      
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
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, md: '8px 24px 14px' },
          width: '100%',
          maxWidth: 1240,
          mx: 'auto',
        }}
      >
        {isFetchingSession ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 'auto', gap: 2 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
            <Typography variant="body2" sx={{ color: '#64748B'}}>
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
                sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}
              >
                No Session Assigned
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: '#64748B', lineHeight: 1.6}}
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
          <Box sx={{ width: '100%', height: { md: '100%' }, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: { xs: 2, md: 1.75 } }}>

            {/* Welcome Header */}
            <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.5 }}>
              <Typography
                variant="h3"
                sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', md: '1.75rem' }, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2 }}
              >
                Welcome, {traineeName}
              </Typography>
              <Chip
                label={currentSession?.module_name ? `${currentSession.module_name.toUpperCase()} ASSESSMENT` : 'VIVA ASSESSMENT'}
                size="small"
                sx={{
                  bgcolor: 'rgba(242, 101, 34, 0.08)',
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: '0.04em',
                  borderRadius: 1.5,
                  border: '1px solid rgba(242, 101, 34, 0.2)',
                }}
              />
              </Box>
              {/* Dropped on short screens so the cards keep their room. */}
              <Typography
                variant="body1"
                sx={{ color: '#64748B', fontSize: '0.9rem', maxWidth: 580, '@media (max-height: 760px)': { display: 'none' } }}
              >
                Complete your system readiness check and review the exam protocol before launching your AI viva session.
              </Typography>
            </Box>

            {/* Three columns on desktop: protocol | camera + identity photo | readiness checks.
                The row takes whatever height is left (capped, so it doesn't stretch on tall
                screens) and each card scrolls inside itself rather than the page. */}
            <Box
              sx={{
                width: '100%',
                flex: { md: '1 1 0' },
                minHeight: 0,
                maxHeight: { md: 560 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1fr)' },
                gridTemplateRows: { md: 'minmax(0, 1fr)' },
                gap: 2,
              }}
            >
              {/* Protocol */}
              <Card elevation={0} sx={CARD_SX}>
                <CardContent sx={CARD_CONTENT_SX}>
                  <CardHeading icon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />} title="Assessment Protocol" />
                  <ProtocolRow icon={<TimerOutlinedIcon sx={{ fontSize: 16 }} />} color="#F26522" title="Session Duration">
                    About {currentSession?.duration_minutes || '15'} minutes, in a quiet, well-lit room.
                  </ProtocolRow>
                  <ProtocolRow icon={<FormatListNumberedOutlinedIcon sx={{ fontSize: 16 }} />} color="#0EA5E9" title="Adaptive Questions">
                    {currentSession?.total_questions ? `${currentSession.total_questions} questions` : 'Targeted questions'} on {currentSession?.module_name || 'your assigned module'}.
                  </ProtocolRow>
                  <ProtocolRow icon={<SmartToyOutlinedIcon sx={{ fontSize: 16 }} />} color="#10B981" title="AI Voice Evaluation">
                    Spoken answers are transcribed and graded.
                  </ProtocolRow>
                  <ProtocolRow icon={<ShieldOutlinedIcon sx={{ fontSize: 16 }} />} color="#6366F1" title="Integrity & Proctoring">
                    Stay on camera and don't switch tabs.
                  </ProtocolRow>
                  {faceRequired && (
                    <ProtocolRow icon={<FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 16 }} />} color="#F26522" title="Identity Photo">
                      Only you in frame. Used only to confirm who sits the exam.
                    </ProtocolRow>
                  )}
                </CardContent>
              </Card>

              {/* Camera + identity photo */}
              <Card elevation={0} sx={CARD_SX}>
                <CardContent sx={CARD_CONTENT_SX}>
                  <CardHeading
                    icon={faceRequired ? <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 18 }} /> : <VideocamOutlinedIcon sx={{ fontSize: 18 }} />}
                    title={faceRequired ? 'Camera & Identity Photo' : 'Camera Preview'}
                    right={faceRequired ? <StatusChip ok={Boolean(facePhoto)} label={facePhoto ? 'Captured' : 'Required'} /> : null}
                  />
                  <Box sx={{ flex: { md: '1 1 0' }, height: { xs: 320, md: 'auto' }, minHeight: 0 }}>
                    {faceRequired && stream ? (
                      <FaceReferenceCapture
                        layout="stacked"
                        stream={stream}
                        disabled={isStartingSession}
                        onAccepted={setFacePhoto}
                        onReset={() => setFacePhoto(null)}
                        onUnavailable={() => setFaceUnavailable(true)}
                      />
                    ) : (
                      <Box sx={{ width: '100%', height: '100%', minHeight: 140, bgcolor: '#0F172A', borderRadius: 2, overflow: 'hidden', position: 'relative', border: '1px solid #E2E8F0' }}>
                        <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {stream ? (
                          <Box sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', px: 1, py: 0.3, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
                            <Typography variant="caption" sx={{ color: '#FFFFFF', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                              FEED ACTIVE
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                              Requesting camera & microphone access...
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* Readiness checks */}
              <Card elevation={0} sx={CARD_SX}>
                <CardContent sx={CARD_CONTENT_SX}>
                  <CardHeading
                    icon={<FactCheckOutlinedIcon sx={{ fontSize: 18 }} />}
                    title={faceRequired ? 'Readiness Check' : 'Hardware Readiness'}
                    right={<StatusChip ok={isReady} label={`${readyCount}/${totalChecks} Verified`} />}
                  />
                  <Stack spacing={1}>
                    {[
                      { label: 'Camera Sensor', icon: <VideocamOutlinedIcon sx={{ fontSize: 16 }} />, status: checks.camera },
                      { label: 'Microphone Input', icon: <MicNoneOutlinedIcon sx={{ fontSize: 16 }} />, status: checks.mic },
                      { label: 'Audio Speaker', icon: <VolumeUpOutlinedIcon sx={{ fontSize: 16 }} />, status: checks.speaker },
                      { label: 'Network Connection', icon: <WifiOutlinedIcon sx={{ fontSize: 16 }} />, status: checks.network },
                      { label: 'Browser Compatibility', icon: <PublicOutlinedIcon sx={{ fontSize: 16 }} />, status: checks.browser },
                      ...(faceRequired ? [{ label: 'Identity Photo', icon: <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 16 }} />, status: facePhoto ? 'passed' : 'pending' }] : []),
                    ].map((item) => (
                      <Box
                        key={item.label}
                        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 0.9, borderRadius: 1.5, bgcolor: '#F8FAFC', border: '1px solid #F1F5F9' }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <Box sx={{ color: '#64748B', display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
                          <Typography variant="body2" sx={{ color: '#0F172A', fontSize: '0.825rem', fontWeight: 500 }}>
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
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
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
                  px: 5,
                  py: 1.1,
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
              {/* Fixed height so the cards above don't resize when this line goes away. */}
              <Box sx={{ minHeight: 20 }}>
                {!isReady && (
                  <Typography variant="caption" sx={{ color: '#EF4444', fontSize: '0.8rem', fontWeight: 500 }}>
                    {!hardwareReady
                      ? 'Please allow camera and microphone permissions in your browser to proceed.'
                      : 'Please take your identity photo to proceed.'}
                  </Typography>
                )}
              </Box>
            </Box>

          </Box>
        )}
      </Box>
    </Box>
  );
}
