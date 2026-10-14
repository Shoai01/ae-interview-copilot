import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, Stack, CircularProgress } from '@mui/material';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import { vivaService } from '@/services/api';
import { captureFrameBlob } from '@/utils/faceCapture';

const TIPS = [
  'Face the camera directly, with your whole face in the oval.',
  'Sit in good light — a window or lamp in front of you, not behind.',
  'Only you should be in the frame. Remove sunglasses and masks.',
];

/**
 * Takes the identity photo that every later camera snapshot in the exam is
 * compared against. The server decides whether the photo is good enough
 * (one face, lit, sharp, frontal...) and says why when it isn't.
 *
 * Props:
 *   stream        live camera MediaStream
 *   onAccepted    (blob) — the photo passed the server's quality check
 *   onReset       the candidate chose to retake after an accepted photo
 *   onUnavailable the face service is down; caller decides whether to let the exam proceed
 *   disabled      lock the controls (e.g. while the session is starting)
 *   layout        'side' (preview left, guidance right - dialogs) or 'stacked'
 *                 (one column for narrow cards; the page shows the tips itself)
 */
export default function FaceReferenceCapture({ stream, onAccepted, onReset, onUnavailable, disabled = false, layout = 'side' }) {
  const stacked = layout === 'stacked';
  const videoRef = useRef(null);
  const [phase, setPhase] = useState('live'); // live | checking | rejected | accepted
  const [photoUrl, setPhotoUrl] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream, phase]);

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  const handleCapture = async () => {
    const blob = await captureFrameBlob(videoRef.current);
    if (!blob) {
      setMessages(['The camera is not ready yet. Wait a moment and try again.']);
      setPhase('rejected');
      return;
    }
    setPhotoUrl(URL.createObjectURL(blob));
    setPhase('checking');
    try {
      const result = await vivaService.precheckFacePhoto(blob);
      if (result.accepted) {
        setMessages([]);
        setPhase('accepted');
        onAccepted?.(blob);
      } else {
        setMessages(result.messages?.length ? result.messages : ['This photo could not be used. Please try again.']);
        setPhase('rejected');
      }
    } catch (err) {
      if (err.response?.status === 503) {
        onUnavailable?.();
        return;
      }
      setMessages(['Could not check the photo. Check your connection and try again.']);
      setPhase('rejected');
    }
  };

  const handleRetake = () => {
    setPhotoUrl(null);
    setMessages([]);
    setPhase('live');
    onReset?.();
  };

  const showPhoto = phase !== 'live' && photoUrl;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: stacked ? '1fr' : { xs: '1fr', md: '280px 1fr' }, gap: stacked ? 1.5 : 3, alignItems: 'center' }}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: stacked ? 340 : 280,
          aspectRatio: '4 / 3',
          mx: stacked ? 'auto' : { xs: 'auto', md: 0 },
          bgcolor: '#0F172A',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
      >
        {showPhoto ? (
          <Box
            component="img"
            src={photoUrl}
            alt="Captured identity photo"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        ) : (
          <>
            <Box
              component="video"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              sx={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            {/* Oval framing guide */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '46%',
                height: '78%',
                transform: 'translate(-50%, -50%)',
                border: '2px dashed rgba(255,255,255,0.75)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }}
            />
          </>
        )}
        {phase === 'checking' && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(15,23,42,0.55)' }}>
            <CircularProgress size={28} sx={{ color: '#FFFFFF' }} />
          </Box>
        )}
      </Box>

      <Stack spacing={1.5} alignItems={stacked ? 'center' : 'stretch'} sx={stacked ? { textAlign: 'center' } : undefined}>
        {phase === 'accepted' ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleIcon sx={{ color: '#16A34A', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
              Photo accepted. It will be used to confirm your identity during the exam.
            </Typography>
          </Stack>
        ) : (
          <>
            {phase === 'rejected' && (
              <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <ErrorOutlineIcon sx={{ color: '#EF4444', fontSize: 18, mt: '2px' }} />
                  <Box>
                    {messages.map((m) => (
                      <Typography key={m} variant="body2" sx={{ color: '#B91C1C', fontSize: '0.825rem', lineHeight: 1.5 }}>
                        {m}
                      </Typography>
                    ))}
                  </Box>
                </Stack>
              </Box>
            )}
            {stacked ? (
              <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.8rem' }}>
                Face the camera with your whole face inside the oval.
              </Typography>
            ) : (
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#64748B' }}>
                {TIPS.map((t) => (
                  <Typography key={t} component="li" variant="body2" sx={{ fontSize: '0.825rem', lineHeight: 1.6 }}>
                    {t}
                  </Typography>
                ))}
              </Box>
            )}
          </>
        )}

        <Box>
          {phase === 'live' && (
            <Button
              variant="contained"
              onClick={handleCapture}
              disabled={disabled || !stream}
              startIcon={<CameraAltOutlinedIcon sx={{ fontSize: 18 }} />}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, boxShadow: 'none' }}
            >
              Capture photo
            </Button>
          )}
          {(phase === 'rejected' || phase === 'accepted') && (
            <Button
              variant="outlined"
              onClick={handleRetake}
              disabled={disabled}
              startIcon={<ReplayIcon sx={{ fontSize: 18 }} />}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              {phase === 'rejected' ? 'Try again' : 'Retake'}
            </Button>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
