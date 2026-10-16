import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Stack,
  CircularProgress,
  Grid,
  Card,
  Chip,
  TextField,
  Alert,
  Collapse,
  Dialog,
  IconButton,
  ButtonGroup,
  Menu,
  MenuItem,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import SendIcon from '@mui/icons-material/Send';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BadgeIcon from '@mui/icons-material/Badge';
import LockIcon from '@mui/icons-material/Lock';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VideocamOffOutlinedIcon from '@mui/icons-material/VideocamOffOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import TabOutlinedIcon from '@mui/icons-material/TabOutlined';
import FullscreenExitOutlinedIcon from '@mui/icons-material/FullscreenExitOutlined';
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined';
import FaceRetouchingOffIcon from '@mui/icons-material/FaceRetouchingOff';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import CloseIcon from '@mui/icons-material/Close';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import PlaylistAddOutlinedIcon from '@mui/icons-material/PlaylistAddOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import CustomAudioPlayer from '@/components/CustomAudioPlayer';
import { FaceGalleryDialog, AuthImage } from '@/components/FaceVerificationPanel';
import useReviewQueue from '@/hooks/useReviewQueue';
import { vivaService } from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import toast from 'react-hot-toast';

function formatReviewTimestamp(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

const toMs = (iso) => new Date(iso).getTime();

function formatClock(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatSeconds(total) {
  const s = Math.max(0, Math.round(total));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

// m:ss offset into the answer
function formatOffset(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const FLAG_META = {
  NO_FACE: { label: 'Face not detected', color: '#DC2626' },
  MULTIPLE_FACES: { label: 'Multiple faces detected', color: '#DC2626' },
  TAB_SWITCH: { label: 'Tab switched away', color: '#D97706' },
  FULLSCREEN_EXIT: { label: 'Exited full-screen', color: '#D97706' },
  BACKGROUND_NOISE: { label: 'Background noise', color: '#CA8A04' },
  FACE_MISMATCH: { label: 'Face did not match the reference', color: '#DC2626' },
};
const flagMeta = (type) => FLAG_META[type] || { label: type, color: '#64748B' };

const FLAG_EPISODES_PREVIEW = 3;

const MERGE_GAP_MS = 2000;

function buildSessionTimeline(questions) {
  const byType = {};
  (questions || []).forEach((q, index) => {
    const qNumber = q.question_order ?? index + 1;
    (q.fraud_flags || []).forEach((flag) => {
      if (flag.type === 'BACKGROUND_NOISE') return;
      (flag.events || []).forEach((e) => {
        (byType[flag.type] ||= []).push({
          type: flag.type,
          start: toMs(e.start),
          end: e.end ? toMs(e.end) : null,
          firstQ: qNumber,
          lastQ: qNumber,
        });
      });
    });
  });

  const merged = [];
  Object.values(byType).forEach((list) => {
    list.sort((a, b) => a.start - b.start);
    let current = null;
    list.forEach((item) => {
      if (current && current.end !== null && item.start - current.end <= MERGE_GAP_MS) {
        current.end = item.end;
        current.lastQ = item.lastQ;
      } else {
        if (current) merged.push(current);
        current = { ...item };
      }
    });
    if (current) merged.push(current);
  });

  return merged.sort((a, b) => a.start - b.start);
}

const FLAG_ICONS = {
  NO_FACE: VideocamOffOutlinedIcon,
  MULTIPLE_FACES: GroupsOutlinedIcon,
  TAB_SWITCH: TabOutlinedIcon,
  FULLSCREEN_EXIT: FullscreenExitOutlinedIcon,
  BACKGROUND_NOISE: GraphicEqOutlinedIcon,
  FACE_MISMATCH: FaceRetouchingOffIcon,
};

const MAX_EXPECTED_FLAG_COUNT = 5;

// Layout's content canvas is the scroll container; these mirror its header height and padding.
const HEADER_HEIGHT = 64;
const STICKY_GAP = 16;
const BAR_HEIGHT_VAR = '--review-bar-h';
const CANVAS_PAD = { md: -3.5, lg: -4 };
const MD_CANVAS_PAD_PX = 28;
const LG_CANVAS_PAD_PX = 32;

const countIntegrityFlags = (flags) =>
  (flags || []).filter((f) => f.type !== 'FACE_MISMATCH').reduce((sum, f) => sum + (f.count || 1), 0);

const LOW_SCORE_THRESHOLD = 5;

const QUESTION_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'FLAGGED', label: 'Flagged' },
  { key: 'LOW', label: 'Low score' },
  { key: 'NO_ANSWER', label: 'No answer' },
];

const DECISION_STYLE = {
  PASS: { label: 'Pass', color: '#16A34A' },
  HOLD: { label: 'Hold', color: '#D97706' },
  FAIL: { label: 'Fail', color: '#DC2626' },
};

const REMARK_TEMPLATES = [
  'Strong fundamentals and clear communication.',
  'Good technical depth; needs more practice on edge cases.',
  'Answers were too brief; practise explaining with examples.',
  'Struggled with core concepts; recommend revisiting the module.',
  'Integrity flags reviewed; no concern.',
  'Integrity flags raise concerns; recommend a re-test.',
];

// One row per question with the derived fields the filters, navigator and cards all share.
function buildQuestionItems(questions) {
  return (questions || []).map((q, i) => {
    const ev = q.evaluation;
    const avg = ev ? ((ev.score_communication || 0) + (ev.score_technical || 0) + (ev.score_confidence || 0)) / 3 : null;
    return {
      q,
      number: i + 1,
      avg,
      hasFlags: (q.fraud_flags || []).some((f) => f.type !== 'FACE_MISMATCH' && f.count > 0),
      noAnswer: !(q.transcript || '').trim(),
    };
  });
}

function matchesFilter(item, key) {
  if (key === 'FLAGGED') return item.hasFlags;
  if (key === 'LOW') return item.avg !== null && item.avg < LOW_SCORE_THRESHOLD;
  if (key === 'NO_ANSWER') return item.noAnswer;
  return true;
}

function ScoreBar({ label, score, color, isCount = false }) {
  const scaleFactor = isCount ? 100 / MAX_EXPECTED_FLAG_COUNT : 10;
  const percentage = Math.min(100, Math.max(0, (score || 0) * scaleFactor));
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flex: 1 }}>
      <Typography variant="caption" sx={{ minWidth: 92, fontWeight: 600, color: '#475569', fontSize: '0.775rem' }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: 6, bgcolor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', minWidth: 50 }}>
        <Box sx={{ width: `${percentage}%`, height: '100%', bgcolor: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </Box>
      <Typography variant="caption" sx={{ minWidth: 28, textAlign: 'right', fontWeight: 700, color: '#0F172A', fontSize: '0.8rem' }}>
        {isCount ? Math.floor(score) : Number(score).toFixed(1)}
      </Typography>
    </Stack>
  );
}

const FLAG_HINT = {
  NO_FACE: 'No face was visible to the camera.',
  MULTIPLE_FACES: 'More than one person was visible in the frame.',
  TAB_SWITCH: 'The candidate moved away from the exam tab.',
  FULLSCREEN_EXIT: 'The candidate left full-screen mode.',
  FACE_MISMATCH: 'The face did not match the reference photo.',
};

// Fetches one proof image as a blob (the endpoint needs the auth header, so <img src> can't be used).
function ProofImage({ proof, alt }) {
  const [state, setState] = useState({ url: null, error: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    vivaService
      .getFlagProofImage(proof.sessionId, proof.flagId, proof.eventIndex)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ url: null, error: true });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [proof.sessionId, proof.flagId, proof.eventIndex, attempt]);

  const retry = () => {
    setState({ url: null, error: false });
    setAttempt((a) => a + 1);
  };

  if (state.error) {
    return (
      <Stack spacing={1.25} sx={{ alignItems: 'center', color: '#94A3B8', textAlign: 'center', p: 3 }}>
        <ImageNotSupportedOutlinedIcon sx={{ fontSize: 40 }} />
        <Typography variant="body2">The snapshot could not be loaded.</Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={retry} sx={{ textTransform: 'none', fontWeight: 600, color: '#E2E8F0' }}>
          Try again
        </Button>
      </Stack>
    );
  }

  if (!state.url) {
    return <CircularProgress sx={{ color: '#94A3B8' }} aria-label="Loading snapshot" />;
  }

  const overlayButtonSx = { bgcolor: 'rgba(15, 23, 42, 0.7)', color: '#FFFFFF', '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.9)' } };

  return (
    <Box sx={{ position: 'relative', maxWidth: '100%', lineHeight: 0 }}>
      <Box
        component="img"
        src={state.url}
        alt={alt}
        sx={{
          maxWidth: '100%',
          maxHeight: '62vh',
          borderRadius: 2,
          objectFit: 'contain',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
        }}
      />
      <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, right: 8 }}>
        <Tooltip title="Open full size in a new tab">
          <IconButton
            size="small"
            component="a"
            href={state.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open full size in a new tab"
            sx={overlayButtonSx}
          >
            <OpenInNewIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download">
          <IconButton
            size="small"
            component="a"
            href={state.url}
            download={`proof-${proof.flagType.toLowerCase()}-${proof.flagId}-${proof.eventIndex + 1}.jpg`}
            aria-label="Download snapshot"
            sx={overlayButtonSx}
          >
            <DownloadOutlinedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

// Viewer for the snapshots captured when an integrity flag fired; steps through every snapshot of the question.
function ProofSnapshotDialog({ proofs, index, onIndexChange, onClose, questionNumber }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const proof = proofs[index];

  const go = useCallback(
    (delta) => {
      const next = index + delta;
      if (next >= 0 && next < proofs.length) onIndexChange(next);
    },
    [index, proofs.length, onIndexChange]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  if (!proof) return null;
  const meta = flagMeta(proof.flagType);
  const Icon = FLAG_ICONS[proof.flagType];
  const isPoint = proof.end === null || proof.end === proof.start;
  const durationMs = isPoint ? 0 : proof.end - proof.start;
  const offsetLabel = proof.askedAt ? `${formatOffset(proof.start - toMs(proof.askedAt))} into the answer` : null;

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 3 },
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 1.75, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${meta.color}1A`, color: meta.color }}>
          {Icon && <Icon sx={{ fontSize: 21 }} />}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }} noWrap>
            {meta.label}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontVariantNumeric: 'tabular-nums', display: 'block' }} noWrap>
            {questionNumber ? `Q${questionNumber} · ` : ''}
            {formatClock(proof.start)}
            {offsetLabel ? ` · ${offsetLabel}` : ''}
          </Typography>
        </Box>
        {proofs.length > 1 && (
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {index + 1} / {proofs.length}
          </Typography>
        )}
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: '#64748B' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: { xs: 0, sm: 320 },
          p: { xs: 1.5, sm: 2.5 },
          bgcolor: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
        }}
      >
        <ProofImage key={`${proof.flagId}-${proof.eventIndex}`} proof={proof} alt={`${meta.label} snapshot`} />
      </Box>

      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.25, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
            {FLAG_HINT[proof.flagType] || 'Snapshot captured when this flag was raised.'}
            {!isPoint && (
              <>
                {' '}
                Lasted <strong style={{ color: meta.color }}>{formatSeconds(durationMs / 1000)}</strong>.
              </>
            )}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8', display: { xs: 'none', sm: 'block' } }}>
            Captured automatically from the camera at the moment the warning was triggered.
          </Typography>
        </Box>
        {proofs.length > 1 && (
          <>
            <Button size="small" startIcon={<ChevronLeftIcon />} disabled={index === 0} onClick={() => go(-1)} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Prev
            </Button>
            <Button size="small" endIcon={<ChevronRightIcon />} disabled={index === proofs.length - 1} onClick={() => go(1)} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Next
            </Button>
          </>
        )}
      </Box>
    </Dialog>
  );
}

// Collapsed per-question timeline with snapshot proof buttons
function FlagTimeline({ flags, askedAt, sessionId, questionNumber }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [proofIndex, setProofIndex] = useState(null);

  const visibleFlags = useMemo(() => (flags || []).filter((f) => f.type !== 'FACE_MISMATCH'), [flags]);

  // Every captured snapshot of this question in time order, so the viewer can step through all of them.
  const proofs = useMemo(
    () =>
      visibleFlags
        .flatMap((flag) =>
          (flag.events || []).flatMap((e, eventIndex) =>
            e.has_image
              ? [{ sessionId, flagId: flag.id, eventIndex, flagType: flag.type, start: toMs(e.start), end: e.end ? toMs(e.end) : null, askedAt }]
              : []
          )
        )
        .sort((a, b) => a.start - b.start),
    [visibleFlags, sessionId, askedAt]
  );

  if (visibleFlags.length === 0) return null;

  const totalCount = visibleFlags.reduce((sum, f) => sum + (f.count || 0), 0);

  return (
    <Box sx={{ borderTop: '1px solid #F1F5F9', bgcolor: '#FFFFFF' }}>
      <Box
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        sx={{
          px: { xs: 2, md: 2.5 },
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          cursor: 'pointer',
          bgcolor: open ? '#FEF2F2' : '#FFFFFF',
          transition: 'background-color 0.2s ease',
          '&:hover': { bgcolor: '#FEF2F2' },
        }}
      >
        <ShieldOutlinedIcon sx={{ fontSize: 18, color: '#DC2626' }} />
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#991B1B' }}>
          Integrity timeline
        </Typography>
        <Chip
          size="small"
          label={`${totalCount} ${totalCount === 1 ? 'flag' : 'flags'}`}
          sx={{ height: 20, fontWeight: 700, fontSize: '0.7rem', bgcolor: '#FEE2E2', color: '#B91C1C' }}
        />
        <Typography
          variant="caption"
          noWrap
          sx={{ flex: 1, minWidth: 0, color: '#64748B', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}
        >
          {visibleFlags.map((f) => `${flagMeta(f.type).label} ${f.count}×`).join('  ·  ')}
        </Typography>
        <Box sx={{ flex: { xs: 1, sm: 0 } }} />
        <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
          {open ? 'Hide' : 'View details'}
        </Typography>
        <ExpandMoreIcon
          sx={{
            fontSize: 20,
            color: '#94A3B8',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.25s ease',
          }}
        />
      </Box>

      <Collapse in={open} timeout={250} unmountOnExit>
        <Box sx={{ px: { xs: 2, md: 2.5 }, pb: 2, pt: 0.5, bgcolor: '#FEF2F2' }}>
          <Stack spacing={1.25}>
            {visibleFlags.map((flag) => {
              const meta = flagMeta(flag.type);
              const hasTimeline = flag.type !== 'BACKGROUND_NOISE';
              const events = hasTimeline ? flag.events || [] : [];
              const shown = expanded[flag.type] ? events : events.slice(0, FLAG_EPISODES_PREVIEW);
              const hidden = events.length - shown.length;
              return (
                <Box
                  key={flag.type}
                  sx={{
                    bgcolor: '#FFFFFF',
                    borderRadius: 2,
                    border: '1px solid #FEE2E2',
                    borderLeft: `4px solid ${meta.color}`,
                    px: 1.75,
                    py: 1.25,
                  }}
                >
                  <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      {meta.label}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${flag.count}×`}
                      sx={{ height: 20, fontWeight: 700, bgcolor: `${meta.color}1A`, color: meta.color }}
                    />
                    {flag.total_seconds > 0 && (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: '#64748B' }}>
                        <AccessTimeIcon sx={{ fontSize: 14 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {formatSeconds(flag.total_seconds)} total
                        </Typography>
                      </Stack>
                    )}
                  </Stack>

                  {hasTimeline && (
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {shown.map((e, i) => {
                        const isPoint = e.end && e.end === e.start;
                        const durationMs = e.end ? toMs(e.end) - toMs(e.start) : 0;
                        return (
                          <Stack key={i} direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            {askedAt && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`${formatOffset(toMs(e.start) - toMs(askedAt))}${
                                  e.end && !isPoint ? ` → ${formatOffset(toMs(e.end) - toMs(askedAt))}` : ''
                                }`}
                                sx={{
                                  height: 22,
                                  fontWeight: 700,
                                  fontVariantNumeric: 'tabular-nums',
                                  borderColor: `${meta.color}66`,
                                  color: '#334155',
                                }}
                              />
                            )}
                            <Typography variant="caption" sx={{ color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                              {formatClock(e.start)}
                              {e.end && !isPoint && ` – ${formatClock(e.end)}`}
                            </Typography>
                            {e.end && !isPoint && (
                              <Typography variant="caption" sx={{ fontWeight: 700, color: meta.color }}>
                                {formatSeconds(durationMs / 1000)}
                              </Typography>
                            )}
                            {!e.end && (
                              <Typography variant="caption" sx={{ color: '#94A3B8', fontStyle: 'italic' }}>
                                not closed (page closed or connection lost)
                              </Typography>
                            )}
                            {e.has_image && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<CameraAltOutlinedIcon sx={{ fontSize: 13 }} />}
                                aria-label={`View snapshot of ${meta.label} at ${formatClock(e.start)}`}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  const at = proofs.findIndex((p) => p.flagId === flag.id && p.eventIndex === i);
                                  if (at >= 0) setProofIndex(at);
                                }}
                                sx={{
                                  height: 24,
                                  px: 1,
                                  ml: 'auto !important',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  borderColor: `${meta.color}55`,
                                  color: meta.color,
                                  bgcolor: '#FFFFFF',
                                  borderRadius: 1.5,
                                  '&:hover': { bgcolor: `${meta.color}12`, borderColor: meta.color },
                                }}
                              >
                                View snapshot
                              </Button>
                            )}
                          </Stack>
                        );
                      })}
                      {events.length > FLAG_EPISODES_PREVIEW && (
                        <Typography
                          variant="caption"
                          role="button"
                          tabIndex={0}
                          onClick={() => setExpanded((prev) => ({ ...prev, [flag.type]: !prev[flag.type] }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setExpanded((prev) => ({ ...prev, [flag.type]: !prev[flag.type] }));
                            }
                          }}
                          sx={{ color: '#B91C1C', cursor: 'pointer', fontWeight: 700, width: 'fit-content' }}
                        >
                          {expanded[flag.type] ? 'Show less' : `+ ${hidden} more`}
                        </Typography>
                      )}
                      {events.length < flag.count && (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          Only the first {events.length} of {flag.count} are listed.
                        </Typography>
                      )}
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Collapse>

      {proofIndex !== null && (
        <ProofSnapshotDialog
          proofs={proofs}
          index={proofIndex}
          onIndexChange={setProofIndex}
          onClose={() => setProofIndex(null)}
          questionNumber={questionNumber}
        />
      )}
    </Box>
  );
}

// -----------------------------------------------------------------------------------
// Unified Proctoring Card: combines biometric face checks and behavioral integrity flags
// -----------------------------------------------------------------------------------
function UnifiedProctoringCard({ sessionId, questions, onOpenFaceGallery }) {
  const [faceSummary, setFaceSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    vivaService
      .getFaceSummary(sessionId)
      .then((s) => {
        if (!cancelled) setFaceSummary(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const timeline = useMemo(() => {
    return buildSessionTimeline(questions).filter((e) => e.type !== 'FACE_MISMATCH');
  }, [questions]);

  const flagRows = useMemo(() => {
    return Object.keys(FLAG_META)
      .filter((type) => type !== 'FACE_MISMATCH')
      .map((type) => {
        if (type === 'BACKGROUND_NOISE') {
          const count = (questions || []).reduce(
            (sum, q) => sum + ((q.fraud_flags || []).find((f) => f.type === type)?.count || 0),
            0
          );
          return { type, count, seconds: null };
        }
        const events = timeline.filter((e) => e.type === type);
        const seconds = events.reduce((sum, e) => sum + (e.end ? (e.end - e.start) / 1000 : 0), 0);
        return { type, count: events.length, seconds };
      })
      .filter((row) => row.count > 0);
  }, [questions, timeline]);

  const totalFlagCount = flagRows.reduce((sum, r) => sum + r.count, 0);
  const totalFlagSeconds = flagRows.reduce((sum, r) => sum + (r.seconds || 0), 0);
  const faceMismatches = faceSummary?.mismatches || 0;
  const isClean = totalFlagCount === 0 && faceMismatches === 0;

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #E2E8F0',
        borderRadius: 2.5,
        bgcolor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F1F5F9',
          bgcolor: '#F8FAFC',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <ShieldOutlinedIcon sx={{ fontSize: 19, color: isClean ? '#059669' : '#DC2626' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
            Integrity & Proctoring
          </Typography>
        </Stack>
        <Chip
          size="small"
          label={isClean ? '✓ Clean Session' : `${totalFlagCount + faceMismatches} Flag${totalFlagCount + faceMismatches > 1 ? 's' : ''}`}
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            height: 22,
            bgcolor: isClean ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: isClean ? '#059669' : '#DC2626',
            border: '1px solid',
            borderColor: isClean ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
          }}
        />
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Biometric Face Identity Section */}
        <Box sx={{ pb: 1.75, mb: 1.75, borderBottom: '1px solid #F1F5F9' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 1 }}>
            Identity Verification
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            {faceSummary?.reference_set ? (
              <AuthImage
                sessionId={sessionId}
                alt="Reference photo"
                sx={{ width: 54, height: 44, borderRadius: 1.5, border: '1px solid #E2E8F0', flexShrink: 0 }}
              />
            ) : (
              <Box
                sx={{
                  width: 54,
                  height: 44,
                  borderRadius: 1.5,
                  bgcolor: '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  fontSize: '0.65rem',
                  flexShrink: 0,
                }}
              >
                No photo
              </Box>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: faceMismatches > 0 ? '#DC2626' : '#0F172A', fontSize: '0.82rem' }}>
                {faceMismatches > 0 ? `${faceMismatches} Face Mismatch${faceMismatches > 1 ? 'es' : ''}` : 'Face Identity Verified'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                {faceSummary ? `${faceSummary.matches} of ${faceSummary.total_checks} checks matched` : 'Loading checks...'}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={onOpenFaceGallery}
              sx={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'none',
                height: 26,
                px: 1,
                borderColor: '#CBD5E1',
                color: '#334155',
                borderRadius: 1.5,
                flexShrink: 0,
                '&:hover': { bgcolor: '#F1F5F9', borderColor: '#94A3B8' },
              }}
            >
              Gallery
            </Button>
          </Stack>
        </Box>

        {/* Behavioral Proctoring Section */}
        <Box>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Behavioral Proctoring
            </Typography>
            {totalFlagSeconds > 0 && (
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#DC2626' }}>
                {formatSeconds(totalFlagSeconds)} flagged
              </Typography>
            )}
          </Stack>

          {flagRows.length === 0 ? (
            <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, display: 'block' }}>
                ✓ No tab switches, candidate absence, or multi-face violations detected.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={0.75}>
              {flagRows.map((row) => {
                const meta = flagMeta(row.type);
                const Icon = FLAG_ICONS[row.type];
                return (
                  <Box
                    key={row.type}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1.25,
                      py: 0.75,
                      borderRadius: 1.5,
                      bgcolor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: 1,
                          bgcolor: `${meta.color}15`,
                          color: meta.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon sx={{ fontSize: 13 }} />
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#0F172A' }} noWrap>
                        {meta.label}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Chip
                        size="small"
                        label={`${row.count}×`}
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: `${meta.color}15`, color: meta.color }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', minWidth: 32, textAlign: 'right' }}>
                        {row.seconds === null ? '—' : formatSeconds(row.seconds)}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </Box>
    </Card>
  );
}

// -----------------------------------------------------------------------------------
// Score by question: one thin bar per question against the low-score line
// -----------------------------------------------------------------------------------
const scoreColor = (avg) => (avg >= 7 ? '#059669' : avg >= LOW_SCORE_THRESHOLD ? '#D97706' : '#DC2626');
const MAX_LABELED_BARS = 12;

function ScoreOverview({ items, onSelect }) {
  if (!items.some((it) => it.avg !== null)) return null;
  const labeled = items.length <= MAX_LABELED_BARS;
  const barSlot = { flex: 1, minWidth: 4, maxWidth: 28 };

  return (
    <Box sx={{ mt: 2.25 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Score by question
        </Typography>
        <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
          out of 10
        </Typography>
      </Stack>

      <Box sx={{ position: 'relative', height: 72, display: 'flex', alignItems: 'stretch', gap: '2px', borderBottom: '1px solid #E2E8F0' }}>
        <Box
          aria-hidden="true"
          sx={{ position: 'absolute', left: 0, right: 0, bottom: `${LOW_SCORE_THRESHOLD * 10}%`, borderTop: '1px dashed #CBD5E1', pointerEvents: 'none' }}
        />
        {items.map(({ q, number, avg, hasFlags }) => (
          <Tooltip
            key={q.viva_question_id}
            arrow
            placement="top"
            title={avg === null ? `Q${number} · not evaluated` : `Q${number} · ${avg.toFixed(1)} / 10${hasFlags ? ' · has integrity flags' : ''}`}
          >
            <Box
              component="button"
              type="button"
              onClick={() => onSelect(q.viva_question_id)}
              aria-label={avg === null ? `Question ${number}, not evaluated` : `Question ${number}, score ${avg.toFixed(1)} out of 10`}
              sx={{
                ...barSlot,
                p: 0,
                border: 0,
                bgcolor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-end',
                '& > span': { transition: 'opacity 0.15s ease' },
                '&:hover > span': { opacity: 0.75 },
                '&:focus-visible': { outline: '2px solid #F26522', outlineOffset: 1 },
              }}
            >
              <Box
                component="span"
                sx={{
                  display: 'block',
                  width: '100%',
                  height: avg === null ? '4%' : `${Math.max(avg * 10, 4)}%`,
                  bgcolor: avg === null ? '#CBD5E1' : scoreColor(avg),
                  borderRadius: '4px 4px 0 0',
                }}
              />
            </Box>
          </Tooltip>
        ))}
      </Box>

      {labeled && (
        <Box sx={{ display: 'flex', gap: '2px', mt: 0.5 }}>
          {items.map(({ q, number }) => (
            <Typography key={q.viva_question_id} variant="caption" sx={{ ...barSlot, textAlign: 'center', fontSize: '0.62rem', fontWeight: 600, color: '#94A3B8' }}>
              {number}
            </Typography>
          ))}
        </Box>
      )}
      <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#94A3B8' }}>
        Dashed line = {LOW_SCORE_THRESHOLD}/10 (low score)
      </Typography>
    </Box>
  );
}

// -----------------------------------------------------------------------------------
// Question Quick-Jumper Navigator: allows instant jump to any question with score & flag tags
// -----------------------------------------------------------------------------------
function QuestionNavigator({ items, total, onSelectQuestion }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #E2E8F0',
        borderRadius: 2.5,
        bgcolor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        // Sticks under the header and never grows taller than the visible area (minus the decision bar).
        position: { xs: 'static', lg: 'sticky' },
        top: { lg: STICKY_GAP - LG_CANVAS_PAD_PX }, // inset is from the content box; cancel the canvas padding
        maxHeight: {
          lg: `calc(100vh - ${HEADER_HEIGHT}px - ${STICKY_GAP * 2}px - var(${BAR_HEIGHT_VAR}, 96px))`,
        },
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          flexShrink: 0,
          borderBottom: '1px solid #F1F5F9',
          bgcolor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
          Questions ({items.length === total ? total : `${items.length} of ${total}`})
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
          Quick Jump
        </Typography>
      </Box>
      <Box
        sx={{
          p: 1.5,
          flex: 1,
          minHeight: 0,
          maxHeight: { xs: 360, lg: 'none' },
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 3 },
        }}
      >
        <Stack spacing={0.85}>
          {items.length === 0 && (
            <Typography variant="caption" sx={{ color: '#94A3B8', textAlign: 'center', py: 2 }}>
              No questions match this filter.
            </Typography>
          )}
          {items.map(({ q, number, avg, hasFlags }) => {
            const isLowScore = avg !== null && avg < LOW_SCORE_THRESHOLD;

            return (
              <Box
                key={q.viva_question_id}
                onClick={() => onSelectQuestion(q.viva_question_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectQuestion(q.viva_question_id);
                  }
                }}
                sx={{
                  display: 'flex',
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.1,
                  borderRadius: 1.75,
                  border: '1px solid',
                  borderColor: hasFlags ? '#FCA5A5' : '#E2E8F0',
                  bgcolor: hasFlags ? '#FEF2F2' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: hasFlags ? '#FEE2E2' : '#F8FAFC',
                    transform: 'translateX(3px)',
                  },
                }}
              >
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
                  <Box
                    sx={{
                      width: 25,
                      height: 25,
                      borderRadius: 1.5,
                      bgcolor: hasFlags ? '#EF4444' : 'rgba(242, 101, 34, 0.1)',
                      color: hasFlags ? '#FFFFFF' : '#F26522',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    Q{number}
                  </Box>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      fontWeight: 600,
                      color: '#0F172A',
                      fontSize: '0.8rem',
                      flex: 1,
                    }}
                  >
                    {q.text}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', ml: 1, flexShrink: 0 }}>
                  {hasFlags && (
                    <Chip
                      size="small"
                      label="Flag"
                      sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#FEE2E2', color: '#DC2626' }}
                    />
                  )}
                  {avg != null ? (
                    <Chip
                      size="small"
                      label={`${avg.toFixed(1)}/10`}
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        bgcolor: isLowScore ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: isLowScore ? '#DC2626' : '#059669',
                      }}
                    />
                  ) : (
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                      —
                    </Typography>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Card>
  );
}

// -----------------------------------------------------------------------------------
// Main Page Component
// -----------------------------------------------------------------------------------
function ReviewWorkspace() {
  const navigate = useNavigate();
  const { id: sessionId } = useParams();
  const { user } = useAuth();
  const queue = useReviewQueue(sessionId);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [trainerNotes, setTrainerNotes] = useState('');
  const [finalScore, setFinalScore] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewConflict, setReviewConflict] = useState(null);
  const [faceGalleryOpen, setFaceGalleryOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [qFilter, setQFilter] = useState('ALL');
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const [confirmFailOpen, setConfirmFailOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [templatesAnchor, setTemplatesAnchor] = useState(null);
  const [submitMenuAnchor, setSubmitMenuAnchor] = useState(null);
  const [pendingGoNext, setPendingGoNext] = useState(false);
  const pendingJumpRef = useRef(null);
  const baselineRef = useRef({ decision: null, notes: '', score: '' });
  const isSubmittedRef = useRef(false);
  const highlightTimerRef = useRef(null);
  const barObserverRef = useRef(null);

  // Publish the decision bar's real height so the sidebar can size itself around it.
  const attachDecisionBar = useCallback((node) => {
    barObserverRef.current?.disconnect();
    barObserverRef.current = null;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const root = node.parentElement;
    const publish = () => {
      const sticky = window.getComputedStyle(node).position === 'sticky';
      root?.style.setProperty(BAR_HEIGHT_VAR, `${sticky ? node.offsetHeight : 0}px`);
    };
    publish();
    barObserverRef.current = new ResizeObserver(publish);
    barObserverRef.current.observe(node);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(highlightTimerRef.current);
      barObserverRef.current?.disconnect();
    },
    []
  );

  // Restore report & check for unsaved local review drafts
  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await vivaService.getSessionReport(sessionId);
        setReportData(data);
        if (data.report) {
          const maxMarksForSession = data.session?.max_marks || (data.questions?.length ? data.questions.length * 10 : 20);
          let decisionVal = data.report.trainer_decision || null;
          let notesVal = data.report.trainer_notes || '';
          let scoreVal =
            data.report.final_score != null
              ? Math.min(maxMarksForSession, Number(data.report.final_score))
              : data.report.aggregate_score != null
              ? Number((data.report.aggregate_score / 10) * maxMarksForSession).toFixed(1)
              : '';

          baselineRef.current = { decision: decisionVal, notes: notesVal, score: scoreVal };

          const reviewedByOther =
            data.report.reviewed_by_id && data.report.reviewed_by_id !== user?.id && user?.role !== 'ADMIN';

          if (reviewedByOther) {
            setReviewConflict({
              reviewed_by_name: data.report.reviewed_by_name,
              reviewed_at: data.report.reviewed_at,
              trainer_decision: data.report.trainer_decision,
              final_score: data.report.final_score,
              trainer_notes: data.report.trainer_notes,
            });
          } else {
            try {
              const savedDraft = sessionStorage.getItem(`trainer_review_draft_${sessionId}`);
              if (savedDraft) {
                const draft = JSON.parse(savedDraft);
                if (draft.selectedDecision !== undefined) decisionVal = draft.selectedDecision;
                if (draft.trainerNotes !== undefined) notesVal = draft.trainerNotes;
                if (draft.finalScore !== undefined) scoreVal = draft.finalScore;
              }
            } catch {
              /* storage unavailable */
            }
          }

          const base = baselineRef.current;
          if (
            !reviewedByOther &&
            (decisionVal !== base.decision || notesVal !== base.notes || String(scoreVal) !== String(base.score))
          ) {
            setDraftRestored(true);
          }

          setSelectedDecision(decisionVal);
          setTrainerNotes(notesVal);
          setFinalScore(scoreVal);
        }
      } catch (err) {
        console.error('Failed to fetch session report:', err);
        setError('Could not load report details.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [sessionId, user?.id, user?.role]);

  // Persist draft
  useEffect(() => {
    if (!sessionId || !reportData) return;
    try {
      if (selectedDecision || trainerNotes || finalScore) {
        sessionStorage.setItem(
          `trainer_review_draft_${sessionId}`,
          JSON.stringify({
            selectedDecision,
            trainerNotes,
            finalScore,
          })
        );
      } else {
        sessionStorage.removeItem(`trainer_review_draft_${sessionId}`);
      }
    } catch {
      /* storage unavailable */
    }
  }, [sessionId, reportData, selectedDecision, trainerNotes, finalScore]);

  // Tab closure guard
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isSubmittedRef.current && (trainerNotes || selectedDecision)) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [trainerNotes, selectedDecision]);

  // Calculate overall competency scores (average across questions)
  const skillAverages = useMemo(() => {
    const evaluated = (reportData?.questions || []).filter((q) => q.evaluation);
    if (evaluated.length === 0) return null;
    const count = evaluated.length;
    const comm = evaluated.reduce((sum, q) => sum + (q.evaluation.score_communication || 0), 0) / count;
    const tech = evaluated.reduce((sum, q) => sum + (q.evaluation.score_technical || 0), 0) / count;
    const conf = evaluated.reduce((sum, q) => sum + (q.evaluation.score_confidence || 0), 0) / count;
    return {
      communication: comm.toFixed(1),
      technical: tech.toFixed(1),
      confidence: conf.toFixed(1),
    };
  }, [reportData?.questions]);

  const questionItems = useMemo(() => buildQuestionItems(reportData?.questions), [reportData?.questions]);
  const filterCounts = useMemo(
    () => Object.fromEntries(QUESTION_FILTERS.map(({ key }) => [key, questionItems.filter((it) => matchesFilter(it, key)).length])),
    [questionItems]
  );
  const visibleItems = useMemo(() => questionItems.filter((it) => matchesFilter(it, qFilter)), [questionItems, qFilter]);

  // Scroll the card into view (cards carry scroll-margin so nothing hides under the bars) and flash it
  const scrollToQuestion = (questionId) => {
    const el = document.getElementById(`question-${questionId}`);
    if (!el) {
      // The card is hidden by the active filter: clear it, then scroll once the list has re-rendered.
      if (qFilter !== 'ALL') {
        pendingJumpRef.current = questionId;
        setQFilter('ALL');
      }
      return;
    }
    setCollapsedIds((prev) => {
      if (!prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    setHighlightedId(questionId);
    clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 1600);
  };

  useEffect(() => {
    if (qFilter !== 'ALL' || pendingJumpRef.current === null) return undefined;
    const id = pendingJumpRef.current;
    pendingJumpRef.current = null;
    const timer = setTimeout(() => scrollToQuestion(id), 0);
    return () => clearTimeout(timer);
  });

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: 'Dashboard', path: '/hr/dashboard' }, { label: 'Sessions', path: '/hr/sessions' }, { label: 'Session Review' }]}>
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error || !reportData) {
    return (
      <Layout breadcrumbs={[{ label: 'Dashboard', path: '/hr/dashboard' }, { label: 'Sessions', path: '/hr/sessions' }, { label: 'Session Review' }]}>
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="error">{error || 'Report not found'}</Typography>
        </Box>
      </Layout>
    );
  }

  const { trainee, summary, report, questions } = reportData;
  const candidateName = trainee?.name || 'Unknown Candidate';
  const avatarLetter = candidateName.charAt(0);
  const maxMarks = reportData?.session?.max_marks || (questions?.length ? questions.length * 10 : 20);

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '0m 0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getAudioSrc = (vivaQuestionId) => `/viva/${sessionId}/answer/${vivaQuestionId}/audio`;

  const getRecChipProps = (rec) => {
    if (rec === 'PASS') return { icon: <CheckCircleIcon sx={{ fontSize: 14 }} />, color: 'success', label: 'Pass' };
    if (rec === 'FAIL') return { icon: <CancelIcon sx={{ fontSize: 14 }} />, color: 'error', label: 'Fail' };
    return { icon: <WarningIcon sx={{ fontSize: 14 }} />, color: 'warning', label: 'Borderline' };
  };

  const decisionButtons = [
    { key: 'PASS', label: 'Pass', color: '#16A34A', bg: 'rgba(34, 197, 94, 0.1)', border: '#16A34A', icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> },
    { key: 'HOLD', label: 'Hold', color: '#D97706', bg: 'rgba(245, 158, 11, 0.1)', border: '#D97706', icon: <WarningIcon sx={{ fontSize: 16 }} /> },
    { key: 'FAIL', label: 'Fail', color: '#DC2626', bg: 'rgba(239, 68, 68, 0.1)', border: '#DC2626', icon: <CancelIcon sx={{ fontSize: 16 }} /> },
  ];

  const submitReview = async (goNext = false) => {
    if (finalScore !== '') {
      const numScore = parseFloat(finalScore);
      if (isNaN(numScore) || numScore < 0 || numScore > maxMarks) {
        toast.error(`Please enter a valid final score between 0 and ${maxMarks}`, { id: 'score-limit' });
        return;
      }
    }
    setSubmitting(true);
    try {
      const scoreToSend = finalScore === '' ? null : Math.min(maxMarks, Math.max(0, parseFloat(finalScore)));
      await vivaService.submitDecision(sessionId, selectedDecision, trainerNotes, scoreToSend);
      isSubmittedRef.current = true;
      try {
        sessionStorage.removeItem(`trainer_review_draft_${sessionId}`);
      } catch {
        /* storage unavailable */
      }
      toast.success('Decision and final score saved successfully', { id: 'decision-status' });
      navigate(goNext && queue.next ? `/hr/review/${queue.next.id}` : '/hr/sessions');
    } catch (err) {
      console.error('Failed to submit decision:', err);
      const detail = err.response?.data?.detail;
      if (err.response?.status === 409 && detail && typeof detail === 'object') {
        setReviewConflict({
          reviewed_by_name: detail.reviewed_by_name,
          reviewed_at: detail.reviewed_at,
          trainer_decision: detail.trainer_decision,
          final_score: detail.final_score,
          trainer_notes: detail.trainer_notes,
        });
        toast.error('Another trainer has already submitted a review for this session.', { id: 'decision-status' });
      } else {
        toast.error(typeof detail === 'string' ? detail : 'Failed to save review decision', { id: 'decision-status' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const requestSubmit = (goNext = false) => {
    if (selectedDecision === 'FAIL') {
      setPendingGoNext(goNext);
      setConfirmFailOpen(true);
    } else {
      submitReview(goNext);
    }
  };

  const submitButtonSx = {
    px: 3,
    py: 1,
    fontWeight: 700,
    fontSize: '0.875rem',
    borderRadius: 2,
    textTransform: 'none',
    bgcolor: 'primary.main',
    flexShrink: 0,
    '&:hover': { bgcolor: '#D9531E' },
  };

  const submitDisabled =
    !!reviewConflict ||
    !selectedDecision ||
    submitting ||
    (finalScore !== '' && (parseFloat(finalScore) < 0 || parseFloat(finalScore) > maxMarks));

  const discardDraft = () => {
    const base = baselineRef.current;
    setSelectedDecision(base.decision);
    setTrainerNotes(base.notes);
    setFinalScore(base.score);
    setDraftRestored(false);
    try {
      sessionStorage.removeItem(`trainer_review_draft_${sessionId}`);
    } catch {
      /* storage unavailable */
    }
  };

  const toggleCollapsed = (id) =>
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allCollapsed = visibleItems.length > 0 && visibleItems.every((it) => collapsedIds.has(it.q.viva_question_id));
  const toggleAllCollapsed = () =>
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      visibleItems.forEach((it) => (allCollapsed ? next.delete(it.q.viva_question_id) : next.add(it.q.viva_question_id)));
      return next;
    });

  const aiScore =
    report?.aggregate_score != null
      ? Math.min(maxMarks, Number(((report.aggregate_score / 10) * maxMarks).toFixed(1)))
      : null;
  const aiLabel = report?.ai_recommendation ? getRecChipProps(report.ai_recommendation).label : null;
  const reviewedStyle = DECISION_STYLE[report?.trainer_decision];

  return (
    <Layout
      breadcrumbs={[
        { label: 'Dashboard', path: '/hr/dashboard' },
        { label: 'Sessions', path: '/hr/sessions' },
        { label: candidateName ? `Review: ${candidateName}` : 'Session Review' },
      ]}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%', minHeight: '100%' }}>
        {/* Title row: who, which module, review status, when and how long */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', minWidth: 0, maxWidth: '100%' }}>
            <Avatar sx={{ width: 52, height: 52, bgcolor: 'rgba(242, 101, 34, 0.1)', color: '#F26522', fontWeight: 700, fontSize: 21 }}>
              {avatarLetter}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2, letterSpacing: '-0.02em' }} noWrap>
                {candidateName}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B' }} noWrap>
                {trainee?.username || 'N/A'} · {reportData.session?.module_name || 'Module'}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.25} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {queue.ready && (queue.prev || queue.next) && (
              <Box
                role="group"
                aria-label="Review queue"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 32,
                  bgcolor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Tooltip title={queue.prev ? `Previous: ${queue.prev.trainee_name} · ${queue.prev.module_name}` : 'No earlier pending review'}>
                  <Box component="span" sx={{ display: 'inline-flex' }}>
                    <IconButton
                      size="small"
                      disabled={!queue.prev}
                      onClick={() => navigate(`/hr/review/${queue.prev.id}`)}
                      aria-label="Previous pending review"
                      sx={{ width: 32, height: 32, borderRadius: 0, color: '#475569' }}
                    >
                      <ChevronLeftIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Box>
                </Tooltip>
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '100%',
                    px: 1.5,
                    borderLeft: '1px solid #E2E8F0',
                    borderRight: '1px solid #E2E8F0',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    lineHeight: 1,
                    color: '#475569',
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {queue.index >= 0 ? `${queue.index + 1} of ${queue.total} pending` : `${queue.total} pending`}
                </Box>
                <Tooltip title={queue.next ? `Next: ${queue.next.trainee_name} · ${queue.next.module_name}` : 'No more pending reviews'}>
                  <Box component="span" sx={{ display: 'inline-flex' }}>
                    <IconButton
                      size="small"
                      disabled={!queue.next}
                      onClick={() => navigate(`/hr/review/${queue.next.id}`)}
                      aria-label="Next pending review"
                      sx={{ width: 32, height: 32, borderRadius: 0, color: '#475569' }}
                    >
                      <ChevronRightIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Box>
                </Tooltip>
              </Box>
            )}
            <Tooltip
              title={
                reviewedStyle
                  ? `Reviewed by ${report.reviewed_by_name || 'a trainer'}${
                      formatReviewTimestamp(report.reviewed_at) ? ` on ${formatReviewTimestamp(report.reviewed_at)}` : ''
                    }`
                  : 'No decision has been submitted for this session yet'
              }
            >
              <Chip
                icon={reviewedStyle ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <HourglassEmptyIcon sx={{ fontSize: 16 }} />}
                label={reviewedStyle ? `Reviewed · ${reviewedStyle.label}` : 'Pending review'}
                sx={{
                  fontWeight: 700,
                  height: 30,
                  bgcolor: `${reviewedStyle?.color || '#6366F1'}14`,
                  color: reviewedStyle?.color || '#4F46E5',
                  border: `1px solid ${reviewedStyle?.color || '#6366F1'}40`,
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            </Tooltip>
            <Box sx={{ px: 1.25, height: 30, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarTodayIcon sx={{ fontSize: 14, color: '#64748B' }} />
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                {reportData.session?.start_time
                  ? new Date(reportData.session.start_time).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </Typography>
            </Box>
            <Box sx={{ px: 1.25, height: 30, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTimeIcon sx={{ fontSize: 14, color: '#64748B' }} />
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                {formatDuration(summary.duration_seconds)}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Exam ended by the system for too many integrity violations */}
        {reportData.session?.end_reason && (
          <Alert severity="error" sx={{ borderRadius: 2.5, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              This exam was auto-submitted by the system.
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {reportData.session.end_reason}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#64748B' }}>
              Answers after this point were not given. Review the flags below before deciding.
            </Typography>
          </Alert>
        )}

        {/* Already-reviewed notice */}
        {reviewConflict && (
          <Alert severity="info" icon={<LockIcon sx={{ fontSize: 20 }} />} sx={{ borderRadius: 2.5, border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              This session was already reviewed by {reviewConflict.reviewed_by_name || 'another trainer'}
              {formatReviewTimestamp(reviewConflict.reviewed_at) ? ` on ${formatReviewTimestamp(reviewConflict.reviewed_at)}` : ''}.
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Decision: <strong>{reviewConflict.trainer_decision || '—'}</strong>
              {reviewConflict.final_score != null && (
                <>
                  {' '}
                  · Score: <strong>{reviewConflict.final_score}</strong>
                </>
              )}
              {reviewConflict.trainer_notes && <> · Notes: "{reviewConflict.trainer_notes}"</>}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#64748B' }}>
              Only they or an admin can change this review. The form below is read-only.
            </Typography>
          </Alert>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TWO-COLUMN WORKSPACE                                           */}
        {/* ------------------------------------------------------------- */}
        <Grid container spacing={3}>
          {/* Left Column: summary cards scroll with the page; the question navigator sticks */}
          <Grid size={{ xs: 12, lg: 4.2, xl: 3.8 }} sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1 }}>
              {/* 1. Candidate Profile & Overall Scores Card */}
              <Card
                elevation={0}
                sx={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 2.5,
                  bgcolor: '#FFFFFF',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ p: 2.25 }}>
                  {/* Verdict & Score Highlight */}
                  <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', mb: 2 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        AI Verdict
                      </Typography>
                      {report?.ai_recommendation && (
                        <Chip
                          size="small"
                          icon={getRecChipProps(report.ai_recommendation).icon}
                          label={getRecChipProps(report.ai_recommendation).label}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            height: 22,
                            bgcolor:
                              report.ai_recommendation === 'PASS'
                                ? 'rgba(34, 197, 94, 0.12)'
                                : report.ai_recommendation === 'FAIL'
                                ? 'rgba(239, 68, 68, 0.12)'
                                : 'rgba(245, 158, 11, 0.12)',
                            color:
                              report.ai_recommendation === 'PASS'
                                ? '#16A34A'
                                : report.ai_recommendation === 'FAIL'
                                ? '#DC2626'
                                : '#D97706',
                          }}
                        />
                      )}
                    </Stack>

                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                          Final / Max Score
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                          {report?.final_score != null
                            ? `${Math.min(maxMarks, Number(report.final_score)).toFixed(1)}`
                            : report?.aggregate_score != null
                            ? `${Number((report.aggregate_score / 10) * maxMarks).toFixed(1)}`
                            : '—'}
                          <Typography component="span" sx={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600, ml: 0.5 }}>
                            / {maxMarks}
                          </Typography>
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                          AI Aggregate
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {report?.aggregate_score != null ? `${Number((report.aggregate_score / 10) * maxMarks).toFixed(1)} pts` : '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Overall Skill Competency Breakdown */}
                  {skillAverages && (
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 1.25 }}
                      >
                        Overall Skill Scores
                      </Typography>
                      <Stack spacing={1.25}>
                        <ScoreBar label="Communication" score={skillAverages.communication} color="#0EA5E9" />
                        <ScoreBar label="Technical" score={skillAverages.technical} color="#F26522" />
                        <ScoreBar label="Confidence" score={skillAverages.confidence} color="#6366F1" />
                      </Stack>
                    </Box>
                  )}

                  <ScoreOverview items={questionItems} onSelect={scrollToQuestion} />
                </Box>
              </Card>

              {/* 2. Unified Proctoring & Identity Card */}
              <UnifiedProctoringCard sessionId={sessionId} questions={questions} onOpenFaceGallery={() => setFaceGalleryOpen(true)} />

              {/* 3. Question Quick-Jumper */}
              <QuestionNavigator items={visibleItems} total={questionItems.length} onSelectQuestion={scrollToQuestion} />
            </Box>
          </Grid>

          {/* Right Column: Detailed Insights & Questions */}
          <Grid size={{ xs: 12, lg: 7.8, xl: 8.2 }} sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Executive AI Analysis (Strengths & Areas for Improvement) */}
              {report ? (
                <Card
                  elevation={0}
                  sx={{
                    p: 0,
                    overflow: 'hidden',
                    border: '1px solid #E2E8F0',
                    borderRadius: 2.5,
                    bgcolor: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <Box sx={{ p: { xs: 2, md: 2.5 } }}>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1.5,
                          bgcolor: 'rgba(242, 101, 34, 0.1)',
                          color: '#F26522',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <PsychologyIcon sx={{ fontSize: 19 }} />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem' }}>
                        Executive AI Evaluation
                      </Typography>
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid rgba(34, 197, 94, 0.25)', height: '100%' }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: '#16A34A',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                              mb: 0.75,
                            }}
                          >
                            <CheckCircleIcon sx={{ fontSize: 15 }} /> Key Strengths
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6, fontSize: '0.85rem' }}>
                            {report.strengths || 'No specific strengths recorded.'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid rgba(242, 101, 34, 0.25)', height: '100%' }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: '#EA580C',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                              mb: 0.75,
                            }}
                          >
                            <WarningIcon sx={{ fontSize: 15 }} /> Areas For Improvement
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6, fontSize: '0.85rem' }}>
                            {report.areas_of_improvement || 'No specific improvements recorded.'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Card>
              ) : null}

              {/* Trainer Remarks (if present) */}
              {report?.trainer_notes && (
                <Card
                  elevation={0}
                  sx={{
                    p: 2.25,
                    border: '1px solid #E2E8F0',
                    borderRadius: 2.5,
                    bgcolor: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366F1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BadgeIcon sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      Trainer Review Remarks
                    </Typography>
                  </Stack>
                  <Box sx={{ p: 1.75, borderRadius: 1.75, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                      {report.trainer_notes}
                    </Typography>
                  </Box>
                </Card>
              )}

              {/* Questions & Responses List */}
              <Box>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', fontSize: '1.05rem' }}>
                    Questions & Responses ({visibleItems.length === questionItems.length ? questionItems.length : `${visibleItems.length} of ${questionItems.length}`})
                  </Typography>
                  {visibleItems.length > 0 && (
                    <Button
                      size="small"
                      startIcon={allCollapsed ? <UnfoldMoreIcon /> : <UnfoldLessIcon />}
                      onClick={toggleAllCollapsed}
                      sx={{ textTransform: 'none', fontWeight: 600, color: '#475569', flexShrink: 0 }}
                    >
                      {allCollapsed ? 'Expand all' : 'Collapse all'}
                    </Button>
                  )}
                </Stack>

                {questionItems.length > 1 && (
                  <Stack direction="row" spacing={1} useFlexGap role="group" aria-label="Filter questions" sx={{ flexWrap: 'wrap', mb: 2 }}>
                    {QUESTION_FILTERS.filter((f) => f.key === 'ALL' || filterCounts[f.key] > 0 || qFilter === f.key).map((f) => {
                      const active = qFilter === f.key;
                      return (
                        <Chip
                          key={f.key}
                          clickable
                          onClick={() => setQFilter(f.key)}
                          aria-pressed={active}
                          label={`${f.label} (${filterCounts[f.key]})`}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            height: 28,
                            bgcolor: active ? '#0F172A' : '#FFFFFF',
                            color: active ? '#FFFFFF' : '#475569',
                            border: '1px solid',
                            borderColor: active ? '#0F172A' : '#E2E8F0',
                            '&:hover': { bgcolor: active ? '#1E293B' : '#F1F5F9' },
                          }}
                        />
                      );
                    })}
                  </Stack>
                )}

                <Stack spacing={2.5}>
                  {questions.length === 0 ? (
                    <Card elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#FFFFFF', textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#64748B' }}>
                        No questions were recorded for this session.
                      </Typography>
                    </Card>
                  ) : visibleItems.length === 0 ? (
                    <Card elevation={0} sx={{ p: 3, border: '1px dashed #CBD5E1', borderRadius: 2.5, bgcolor: '#FFFFFF', textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#64748B' }}>
                        No questions match this filter.
                      </Typography>
                      <Button size="small" onClick={() => setQFilter('ALL')} sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}>
                        Show all questions
                      </Button>
                    </Card>
                  ) : (
                    visibleItems.map(({ q, number, avg, hasFlags }) => {
                      const isCollapsed = collapsedIds.has(q.viva_question_id);

                      return (
                        <Card
                          key={q.viva_question_id}
                          id={`question-${q.viva_question_id}`}
                          elevation={0}
                          sx={{
                            p: 0,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: highlightedId === q.viva_question_id ? '#F26522' : '#E2E8F0',
                            borderRadius: 2.5,
                            bgcolor: '#FFFFFF',
                            boxShadow:
                              highlightedId === q.viva_question_id
                                ? '0 0 0 3px rgba(242, 101, 34, 0.35)'
                                : '0 1px 3px rgba(0, 0, 0, 0.03)',
                            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                            scrollMarginTop: STICKY_GAP,
                          }}
                        >
                          {/* Question Header */}
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: { xs: 'column', sm: 'row' },
                              justifyContent: 'space-between',
                              alignItems: { xs: 'stretch', sm: 'flex-start' },
                              gap: 1.5,
                              p: { xs: 2, md: 2.5 },
                              pb: isCollapsed ? { xs: 2, md: 2.5 } : 1,
                            }}
                          >
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 1.5,
                                  flexShrink: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: 'rgba(242, 101, 34, 0.1)',
                                  color: '#F26522',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  mt: 0.2,
                                }}
                              >
                                Q{number}
                              </Box>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 600,
                                  color: '#0F172A',
                                  lineHeight: 1.5,
                                  pt: 0.25,
                                  minWidth: 0,
                                  overflowWrap: 'anywhere',
                                  ...(isCollapsed && { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', overflowWrap: 'normal' }),
                                }}
                              >
                                {q.text}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0, pl: { xs: 5.5, sm: 0 } }}>
                              {hasFlags && (
                                <Chip
                                  size="small"
                                  icon={<ShieldOutlinedIcon sx={{ fontSize: 13 }} />}
                                  label={`${countIntegrityFlags(q.fraud_flags)} ${countIntegrityFlags(q.fraud_flags) === 1 ? 'flag' : 'flags'}`}
                                  sx={{ fontSize: 11, fontWeight: 700, bgcolor: '#FEE2E2', color: '#B91C1C', borderRadius: 1.5, '& .MuiChip-icon': { color: 'inherit' } }}
                                />
                              )}
                              <Chip
                                size="small"
                                icon={<AccessTimeIcon sx={{ fontSize: 13 }} />}
                                label={formatDuration(q.duration)}
                                variant="outlined"
                                sx={{ fontSize: 11, fontWeight: 600, borderColor: '#E2E8F0', color: '#64748B', borderRadius: 1.5 }}
                              />
                              {avg != null && (
                                <Chip
                                  size="small"
                                  label={`Score: ${avg.toFixed(1)}/10`}
                                  sx={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    bgcolor: Number(avg) >= 7 ? 'rgba(16, 185, 129, 0.1)' : Number(avg) >= 5 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: Number(avg) >= 7 ? '#059669' : Number(avg) >= 5 ? '#D97706' : '#DC2626',
                                    borderRadius: 1.5,
                                  }}
                                />
                              )}
                              <IconButton
                                size="small"
                                onClick={() => toggleCollapsed(q.viva_question_id)}
                                aria-label={isCollapsed ? `Expand question ${number}` : `Collapse question ${number}`}
                                aria-expanded={!isCollapsed}
                                sx={{ color: '#64748B' }}
                              >
                                <ExpandMoreIcon sx={{ fontSize: 20, transform: isCollapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.25s ease' }} />
                              </IconButton>
                            </Stack>
                          </Box>

                          <Collapse in={!isCollapsed} timeout={200} sx={{ '& .MuiCollapse-wrapperInner': { display: 'flow-root' } }}>
                          {/* Candidate Transcript */}
                          <Box sx={{ mx: { xs: 2, md: 2.5 }, mt: 1, p: 2, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Candidate Spoken Transcript
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#0F172A',
                                fontStyle: 'italic',
                                lineHeight: 1.7,
                                fontSize: '0.88rem',
                                overflowWrap: 'anywhere',
                                whiteSpace: 'pre-wrap',
                                maxHeight: 280,
                                overflowY: 'auto',
                                overscrollBehavior: 'contain',
                                pr: 0.5,
                                '&::-webkit-scrollbar': { width: 6 },
                                '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 3 },
                              }}
                            >
                              "{q.transcript || '(No spoken answer was recorded)'}"
                            </Typography>

                            {q.evaluation?.ai_feedback && (
                              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #E2E8F0' }}>
                                <Typography variant="caption" sx={{ color: '#F26522', fontWeight: 700, display: 'block', mb: 0.3, letterSpacing: '0.02em' }}>
                                  AI Feedback
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.84rem', lineHeight: 1.6 }}>
                                  {q.evaluation.ai_feedback}
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          {/* Audio Player */}
                          {q.audio_url && (
                            <Box sx={{ mx: { xs: 2, md: 2.5 }, mt: 1.5 }}>
                              <CustomAudioPlayer src={getAudioSrc(q.viva_question_id)} title={`Candidate Voice Recording (Q${number})`} />
                            </Box>
                          )}

                          {/* Scores Bar */}
                          <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.75, bgcolor: '#FFFFFF', borderTop: '1px solid #F1F5F9' }}>
                            {q.evaluation ? (
                              <Box
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                                  columnGap: 4,
                                  rowGap: 1.5,
                                }}
                              >
                                <ScoreBar label="Communication" score={q.evaluation.score_communication || 0} color="#0EA5E9" />
                                <ScoreBar label="Technical" score={q.evaluation.score_technical || 0} color="#F26522" />
                                <ScoreBar label="Confidence" score={q.evaluation.score_confidence || 0} color="#6366F1" />
                                {q.fraud_flags !== undefined && (
                                  <ScoreBar
                                    label="Integrity Flags"
                                    score={countIntegrityFlags(q.fraud_flags)}
                                    color={countIntegrityFlags(q.fraud_flags) > 0 ? '#EF4444' : '#10B981'}
                                    isCount={true}
                                  />
                                )}
                              </Box>
                            ) : (
                              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                                No evaluation metrics available.
                              </Typography>
                            )}
                          </Box>

                          {/* Question Integrity Timeline */}
                          {q.fraud_flags?.length > 0 && <FlagTimeline flags={q.fraud_flags} askedAt={q.asked_at} sessionId={sessionId} questionNumber={number} />}
                          </Collapse>
                        </Card>
                      );
                    })
                  )}
                </Stack>
              </Box>
            </Box>
          </Grid>
        </Grid>

      {/* ------------------------------------------------------------- */}
      {/* Biometric Snapshots Modal Gallery                             */}
      {/* ------------------------------------------------------------- */}
      <FaceGalleryDialog open={faceGalleryOpen} onClose={() => setFaceGalleryOpen(false)} sessionId={sessionId} questions={questions} />

      <Dialog open={confirmFailOpen} onClose={() => setConfirmFailOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#0F172A' }}>Submit as Fail?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            {candidateName} will be marked as <strong style={{ color: '#DC2626' }}>Fail</strong>
            {finalScore !== '' ? ` with ${Number(finalScore)} / ${maxMarks} marks` : ' with no final score'}.
          </Typography>
          {!trainerNotes.trim() && (
            <Typography variant="body2" sx={{ color: '#B45309', mt: 1 }}>
              No remarks were added. Consider explaining the decision first.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmFailOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Go back
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmFailOpen(false);
              submitReview(pendingGoNext);
            }}
            sx={{ textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
          >
            Confirm Fail
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* Decision Panel: pinned to the bottom of the scroll area on desktop,  */}
      {/* a normal card at the end of the page on small screens.               */}
      {/* ------------------------------------------------------------- */}
      <Box
        ref={attachDecisionBar}
        sx={{
          position: { xs: 'static', md: 'sticky' },
          // Sticky insets are measured from the canvas' content box, so cancel its padding to sit flush.
          // (`bottom` takes raw px, unlike margin which uses theme spacing units)
          bottom: { md: -MD_CANVAS_PAD_PX, lg: -LG_CANVAS_PAD_PX },
          zIndex: 5,
          bgcolor: '#FFFFFF',
          px: { xs: 2, md: 3.5, lg: 4 },
          py: 2,
          borderStyle: 'solid',
          borderColor: '#E2E8F0',
          borderWidth: { xs: 1, md: '1px 0 0 0' },
          borderRadius: { xs: 2.5, md: 0 },
          boxShadow: { xs: '0 1px 3px rgba(0, 0, 0, 0.04)', md: '0 -4px 24px rgba(0, 0, 0, 0.08)' },
          // Span the full width of the canvas (cancel its padding) when pinned.
          mx: { md: CANVAS_PAD.md, lg: CANVAS_PAD.lg },
          mb: { md: CANVAS_PAD.md, lg: CANVAS_PAD.lg },
          mt: { md: 'auto' },
        }}
      >
        {!reviewConflict && (aiScore !== null || draftRestored) && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5, mb: 1.25 }}>
            {aiScore !== null && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <PsychologyIcon sx={{ fontSize: 16, color: '#F26522' }} />
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                  AI suggests <strong>{aiScore.toFixed(1)} / {maxMarks}</strong>
                  {aiLabel && ` · ${aiLabel}`}
                </Typography>
                {Number(finalScore) !== aiScore && (
                  <Button size="small" onClick={() => setFinalScore(aiScore)} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', py: 0, minHeight: 22 }}>
                    Use AI score
                  </Button>
                )}
              </Stack>
            )}
            <Box sx={{ flex: 1 }} />
            {draftRestored && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                  Unsaved draft restored
                </Typography>
                <Button size="small" onClick={discardDraft} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', py: 0, minHeight: 22, color: '#DC2626' }}>
                  Discard draft
                </Button>
              </Stack>
            )}
          </Box>
        )}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' } }}>
          {/* Decision Buttons */}
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, '& > button': { flex: { xs: 1, md: 'none' } } }}>
            {decisionButtons.map((btn) => {
              const isSelected = selectedDecision === btn.key;
              return (
                <Button
                  key={btn.key}
                  variant={isSelected ? 'contained' : 'outlined'}
                  onClick={() => setSelectedDecision(btn.key)}
                  disabled={!!reviewConflict}
                  startIcon={btn.icon}
                  sx={{
                    px: 2.25,
                    py: 0.9,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    borderRadius: 2,
                    textTransform: 'none',
                    borderColor: isSelected ? btn.border : '#CBD5E1',
                    bgcolor: isSelected ? btn.border : 'transparent',
                    color: isSelected ? '#FFFFFF !important' : btn.color,
                    boxShadow: isSelected ? `0 2px 8px ${btn.bg}` : 'none',
                    '&:hover': {
                      borderColor: btn.border,
                      bgcolor: isSelected ? btn.border : btn.bg,
                    },
                  }}
                >
                  {btn.label}
                </Button>
              );
            })}
          </Stack>

          {/* Notes Input + remark templates */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
            <TextField
              placeholder="Add final evaluator remarks or feedback for trainee..."
              size="small"
              fullWidth
              multiline
              minRows={1}
              maxRows={3}
              value={trainerNotes}
              onChange={(e) => setTrainerNotes(e.target.value)}
              disabled={!!reviewConflict}
              slotProps={{ htmlInput: { 'aria-label': 'Trainer notes' } }}
              sx={{
                flex: 1,
                minWidth: 0,
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.875rem',
                  bgcolor: '#F8FAFC',
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#E2E8F0' },
                  '&:hover fieldset': { borderColor: '#CBD5E1' },
                },
              }}
            />
            <Tooltip title="Insert a remark template">
              <span>
                <IconButton
                  size="small"
                  disabled={!!reviewConflict}
                  onClick={(e) => setTemplatesAnchor(e.currentTarget)}
                  aria-label="Insert a remark template"
                  sx={{ color: '#475569', border: '1px solid #E2E8F0', borderRadius: 2, bgcolor: '#F8FAFC' }}
                >
                  <PlaylistAddOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Menu anchorEl={templatesAnchor} open={Boolean(templatesAnchor)} onClose={() => setTemplatesAnchor(null)}>
              {REMARK_TEMPLATES.map((text) => (
                <MenuItem
                  key={text}
                  onClick={() => {
                    setTrainerNotes((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
                    setTemplatesAnchor(null);
                  }}
                  sx={{ fontSize: '0.85rem', maxWidth: 420, whiteSpace: 'normal' }}
                >
                  {text}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Final Score Input */}
          <TextField
            label={`Marks (max ${maxMarks})`}
            type="number"
            size="small"
            value={finalScore}
            disabled={!!reviewConflict}
            error={parseFloat(finalScore) > maxMarks || parseFloat(finalScore) < 0}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setFinalScore('');
                return;
              }
              let num = parseFloat(val);
              if (isNaN(num)) return;
              if (num < 0) {
                toast.error('Score cannot be negative', { id: 'score-limit' });
                num = 0;
              } else if (num > maxMarks) {
                toast.error(`Score cannot exceed ${maxMarks} marks`, { id: 'score-limit' });
                num = maxMarks;
              }
              setFinalScore(num);
            }}
            inputProps={{
              step: '0.5',
              min: '0',
              max: maxMarks,
            }}
            sx={{
              width: { xs: '100%', md: 155 },
              flexShrink: 0,
              '& .MuiInputLabel-root': {
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#64748B',
              },
              '& .MuiOutlinedInput-root': {
                fontSize: '0.95rem',
                fontWeight: 700,
                bgcolor: '#FFFFFF',
                borderRadius: 2,
              },
            }}
          />

          {/* Submit Action: with a queue, the main action moves on to the next pending review */}
          {queue.next ? (
            <>
              <ButtonGroup
                variant="contained"
                disabled={submitDisabled}
                sx={{ flexShrink: 0, width: { xs: '100%', md: 'auto' }, boxShadow: '0 2px 8px rgba(242, 101, 34, 0.25)', borderRadius: 2 }}
              >
                <Button
                  endIcon={<SendIcon sx={{ fontSize: 16 }} />}
                  onClick={() => requestSubmit(true)}
                  sx={{ ...submitButtonSx, flex: { xs: 1, md: 'none' } }}
                >
                  {submitting ? 'Submitting...' : 'Submit & Next'}
                </Button>
                <Button
                  size="small"
                  aria-label="More submit options"
                  onClick={(e) => setSubmitMenuAnchor(e.currentTarget)}
                  sx={{ ...submitButtonSx, px: 0.5, minWidth: 36 }}
                >
                  <ArrowDropDownIcon />
                </Button>
              </ButtonGroup>
              <Menu anchorEl={submitMenuAnchor} open={Boolean(submitMenuAnchor)} onClose={() => setSubmitMenuAnchor(null)}>
                <MenuItem
                  onClick={() => {
                    setSubmitMenuAnchor(null);
                    requestSubmit(false);
                  }}
                  sx={{ fontSize: '0.85rem' }}
                >
                  Submit & back to sessions
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              variant="contained"
              endIcon={<SendIcon sx={{ fontSize: 16 }} />}
              disabled={submitDisabled}
              onClick={() => requestSubmit(false)}
              sx={{ ...submitButtonSx, boxShadow: '0 2px 8px rgba(242, 101, 34, 0.25)', width: { xs: '100%', md: 'auto' } }}
            >
              {submitting ? 'Submitting...' : 'Submit Decision'}
            </Button>
          )}
        </Box>
      </Box>
      </Box>
    </Layout>
  );
}

// Keyed by session id so moving to the next/previous review starts from a clean slate.
export default function TrainerReviewDetail() {
  const { id } = useParams();
  return <ReviewWorkspace key={id} />;
}
