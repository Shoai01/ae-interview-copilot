import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, Stack, CircularProgress } from '@mui/material';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import { vivaService } from '@/services/api';
import { captureFrameBlob } from '@/utils/faceCapture';
import { useLiveFaceCheck } from '@/hooks/useLiveFaceCheck';

const TIPS = [
  'Face the camera directly, with your whole face in the oval.',
  'Sit in good light — a window or lamp in front of you, not behind.',
  'Only you should be in the frame. Remove sunglasses and masks.',
];

// Guide colours: white until the first verdict, then red/green from the live check.
const TONE_COLOR = { idle: 'rgba(255,255,255,0.92)', bad: '#EF4444', ok: '#22C55E' };
const TONE_TEXT = { idle: '#64748B', bad: '#DC2626', ok: '#16A34A' };

// Consecutive passing frames needed before Capture unlocks (~0.5 s), so one lucky frame can't.
const REQUIRED_PASS_STREAK = 2;

function ConditionChip({ label }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.9,
        py: 0.2,
        borderRadius: 1,
        fontSize: '0.7rem',
        fontWeight: 600,
        color: '#DC2626',
        bgcolor: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.3)',
      }}
    >
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#DC2626' }} />
      {label}
    </Box>
  );
}

/**
 * Takes the identity photo that every later camera snapshot in the exam is
 * compared against.
 *
 * While the camera is live the server checks each frame (face found, one
 * person, distance, position, lighting, focus, facing the camera) and the
 * oval, the eye markers and the status line turn red until every condition
 * passes, then green; Capture stays disabled until then. If the live check
 * can't be reached, Capture is allowed and the server's check on the captured
 * photo remains the gate.
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
  const frameRef = useRef(null);
  const [phase, setPhase] = useState('live'); // live | checking | rejected | accepted
  const [photoUrl, setPhotoUrl] = useState(null);
  const [messages, setMessages] = useState([]);

  const { live, eyes, passStreak, available } = useLiveFaceCheck(videoRef, frameRef, phase === 'live' && Boolean(stream) && !disabled);
  const hasVerdict = phase === 'live' && available && live !== null;
  const tone = !hasVerdict ? 'idle' : live.ok ? 'ok' : 'bad';
  const color = TONE_COLOR[tone];
  const captureReady = available ? Boolean(live?.ok) && passStreak >= REQUIRED_PASS_STREAK : true;

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

  let statusText = 'Face the camera with your whole face inside the oval.';
  if (hasVerdict) statusText = live.ok ? 'Looks good. Hold still and capture your photo.' : live.message;
  else if (available && phase === 'live' && stream && !disabled) statusText = 'Checking your camera…';

  const failing = hasVerdict ? live.checks.filter((c) => !c.ok) : [];

  return (
    <Box
      sx={stacked
        ? { display: 'flex', flexDirection: 'column', gap: 1.25, height: '100%', minHeight: 0 }
        : { display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 3, alignItems: 'center' }}
    >
      {/* Stacked: the frame fills whatever height the card has left (keeping 4:3),
          so the page never needs to scroll. Side: a fixed-width 4:3 frame. */}
      <Box sx={stacked ? { position: 'relative', flex: '1 1 0', minHeight: 110 } : { display: 'contents' }}>
      <Box
        ref={frameRef}
        sx={{
          ...(stacked
            ? { position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', height: '100%', aspectRatio: '4 / 3', maxWidth: '100%' }
            : { position: 'relative', width: '100%', maxWidth: 280, aspectRatio: '4 / 3', mx: { xs: 'auto', md: 0 } }),
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
            {/* Face guide. The oval is sized to a real face seen at laptop distance (face
                width ~1/3 of the frame, forehead-to-chin ~1.2x its width, just above
                middle) by height with a fixed ratio, so it can't stretch with the frame.
                The huge box-shadow dims everything outside it. */}
            <Box
              sx={{
                position: 'absolute',
                top: '49.5%',
                left: '50%',
                height: '72%',
                aspectRatio: '1 / 1.2',
                transform: 'translate(-50%, -50%)',
                border: `${tone === 'idle' ? 2 : 3}px ${tone === 'idle' ? 'dashed' : 'solid'} ${color}`,
                borderRadius: '50%',
                boxShadow: `0 0 0 100vmax rgba(15,23,42,${tone === 'idle' ? 0.18 : 0.32})${tone === 'ok' ? ', 0 0 14px 2px rgba(34,197,94,0.55)' : ''}`,
                filter: tone === 'idle' ? 'drop-shadow(0 0 2px rgba(0,0,0,0.65))' : undefined,
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                pointerEvents: 'none',
              }}
            >
              {/* Eye-level guide: your eyes should sit on this line. */}
              <Box sx={{ position: 'absolute', left: '10%', right: '10%', top: '39%', borderTop: `1.5px dashed ${color}`, opacity: 0.7, transition: 'border-color 0.2s ease' }} />
            </Box>

            {/* Detected eyes, tracked live. */}
            {hasVerdict && eyes && eyes.map((p, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  left: `${p.x * 100}%`,
                  top: `${p.y * 100}%`,
                  width: 16,
                  height: 16,
                  transform: 'translate(-50%, -50%)',
                  border: `2px solid ${color}`,
                  borderRadius: '50%',
                  bgcolor: 'rgba(15,23,42,0.25)',
                  transition: 'left 0.18s linear, top 0.18s linear, border-color 0.2s ease',
                  pointerEvents: 'none',
                  '&::after': { content: '""', position: 'absolute', top: '50%', left: '50%', width: 4, height: 4, borderRadius: '50%', bgcolor: color, transform: 'translate(-50%, -50%)' },
                }}
              />
            ))}
          </>
        )}
        {phase === 'checking' && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(15,23,42,0.55)' }}>
            <CircularProgress size={28} sx={{ color: '#FFFFFF' }} />
          </Box>
        )}
      </Box>
      </Box>

      <Stack spacing={1.25} alignItems={stacked ? 'center' : 'stretch'} sx={stacked ? { textAlign: 'center' } : undefined}>
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

            {/* Live verdict: the one thing to fix first, plus every condition still failing. */}
            {phase === 'live' && (
              <Stack spacing={0.75} alignItems={stacked ? 'center' : 'flex-start'} aria-live="polite">
                <Typography variant="body2" sx={{ color: TONE_TEXT[tone], fontWeight: hasVerdict ? 700 : 500, fontSize: '0.82rem', lineHeight: 1.35 }}>
                  {statusText}
                </Typography>
                {failing.length > 0 && live.face_found && (
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ justifyContent: stacked ? 'center' : 'flex-start' }}>
                    {failing.map((c) => <ConditionChip key={c.id} label={c.label} />)}
                  </Stack>
                )}
              </Stack>
            )}

            {!stacked && (
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
              disabled={disabled || !stream || !captureReady}
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
