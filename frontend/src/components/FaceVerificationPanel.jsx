import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  IconButton,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import FaceRetouchingNaturalOutlinedIcon from '@mui/icons-material/FaceRetouchingNaturalOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import { vivaService } from '@/services/api';

const SNAPSHOTS_PER_PAGE = 12;

const STATUS_COLOR = { MATCH: '#10B981', MISMATCH: '#EF4444', NO_FACE: '#94A3B8' };
const STATUS_LABEL = { MATCH: 'Matched', MISMATCH: 'Did not match', NO_FACE: 'No face' };

const scrollbarSx = {
  overscrollBehavior: 'contain',
  '&::-webkit-scrollbar': { width: 8 },
  '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 4 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
};

function formatClock(iso) {
  // Backend timestamps are naive UTC.
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

// <img> can't send the auth header, so images are fetched as blobs.
export function AuthImage({ sessionId, checkId = null, alt, sx }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    (checkId == null ? vivaService.getFaceReferenceImage(sessionId) : vivaService.getFaceCheckImage(sessionId, checkId))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sessionId, checkId]);

  if (failed) {
    return (
      <Box sx={{ ...sx, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F1F5F9', color: '#94A3B8', fontSize: '0.7rem' }}>
        Unavailable
      </Box>
    );
  }
  if (!url) return <Skeleton variant="rectangular" sx={sx} />;
  return <Box component="img" src={url} alt={alt} sx={{ objectFit: 'cover', display: 'block', ...sx }} />;
}

function Stat({ label, value, color = '#0F172A' }) {
  return (
    <Box sx={{ p: 1.25, borderRadius: 1.75, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>{label}</Typography>
    </Box>
  );
}

function SectionLabel({ children }) {
  return (
    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
      {children}
    </Typography>
  );
}

function SnapshotTile({ sessionId, check, qLabel, onOpen }) {
  const color = STATUS_COLOR[check.status] || '#94A3B8';
  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      aria-label={`Open snapshot from ${formatClock(check.created_at)}, ${STATUS_LABEL[check.status] || check.status}`}
      sx={{
        all: 'unset',
        display: 'block',
        boxSizing: 'border-box',
        cursor: 'pointer',
        borderRadius: 2,
        border: '1px solid #E2E8F0',
        bgcolor: '#FFFFFF',
        overflow: 'hidden',
        transition: 'box-shadow 0.18s ease, border-color 0.18s ease, transform 0.18s ease',
        '&:hover': { borderColor: color, boxShadow: '0 4px 14px rgba(15, 23, 42, 0.1)', transform: 'translateY(-1px)' },
        '&:focus-visible': { outline: '2px solid #F26522', outlineOffset: 2 },
      }}
    >
      <Box sx={{ position: 'relative', borderBottom: `3px solid ${color}` }}>
        <AuthImage sessionId={sessionId} checkId={check.id} alt={`Snapshot at ${formatClock(check.created_at)}`} sx={{ width: '100%', aspectRatio: '4 / 3' }} />
        {qLabel && (
          <Chip
            size="small"
            label={qLabel}
            sx={{ position: 'absolute', top: 6, left: 6, height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: 'rgba(15, 23, 42, 0.72)', color: '#FFFFFF' }}
          />
        )}
      </Box>
      <Box sx={{ px: 1.1, py: 0.8 }}>
        <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color, lineHeight: 1.25 }}>
          {STATUS_LABEL[check.status] || check.status}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', color: '#64748B', fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
          {formatClock(check.created_at)}
          {check.similarity != null && ` · ${check.similarity.toFixed(2)}`}
        </Typography>
      </Box>
    </Box>
  );
}

// Full-size snapshot next to the reference photo, with prev/next through the filtered list.
function SnapshotViewer({ sessionId, snapshots, index, onIndexChange, onClose, referenceSet, threshold, qLabelFor }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const open = index !== null && snapshots[index] != null;
  const check = open ? snapshots[index] : null;

  const go = useCallback(
    (delta) => {
      if (index === null) return;
      const next = index + delta;
      if (next >= 0 && next < snapshots.length) onIndexChange(next);
    },
    [index, snapshots.length, onIndexChange]
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  if (!check) return null;
  const color = STATUS_COLOR[check.status] || '#94A3B8';
  const qLabel = qLabelFor(check);

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 }, overflow: 'hidden', bgcolor: '#0F172A' } }}
    >
      <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <Chip size="small" label={STATUS_LABEL[check.status] || check.status} sx={{ fontWeight: 700, color, bgcolor: `${color}1A`, border: `1px solid ${color}55` }} />
        <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {formatClock(check.created_at)}
          {qLabel && ` · ${qLabel}`}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {index + 1} / {snapshots.length}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: '#64748B' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          p: { xs: 1.5, sm: 2.5 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: referenceSet ? '1fr 1fr' : '1fr' },
          gap: 2,
          alignItems: 'start',
          ...scrollbarSx,
        }}
      >
        {referenceSet && (
          <Box>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.75 }}>
              Reference photo
            </Typography>
            <AuthImage sessionId={sessionId} alt="Reference photo" sx={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 2, border: '1px solid #334155' }} />
          </Box>
        )}
        <Box>
          <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.75 }}>
            Snapshot
          </Typography>
          <AuthImage
            key={check.id}
            sessionId={sessionId}
            checkId={check.id}
            alt={`Snapshot at ${formatClock(check.created_at)}`}
            sx={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 2, border: `2px solid ${color}` }}
          />
        </Box>
      </Box>

      <Box sx={{ px: 2.5, py: 1.25, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
        <Typography variant="caption" sx={{ color: '#64748B', flex: 1, minWidth: 0 }}>
          {check.similarity != null
            ? `Similarity ${check.similarity.toFixed(2)}${threshold != null ? ` (match threshold ${Number(threshold).toFixed(2)})` : ''}`
            : 'No similarity score for this check.'}
          {check.face_count > 1 && ` · ${check.face_count} faces in frame`}
        </Typography>
        <Button size="small" startIcon={<ChevronLeftIcon />} disabled={index === 0} onClick={() => go(-1)} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Prev
        </Button>
        <Button size="small" endIcon={<ChevronRightIcon />} disabled={index === snapshots.length - 1} onClick={() => go(1)} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Next
        </Button>
      </Box>
    </Dialog>
  );
}

/**
 * Trainer-side identity review for one session: the reference photo taken at
 * the start, how every periodic camera snapshot compared with it, and the
 * snapshots the server kept (all mismatches plus a sample of matches).
 * Scores are for the trainer's judgement only — they never change the AI score.
 *
 * `questions` (optional) is the report's question list, used to label snapshots "Q3".
 */
export function FaceGalleryDialog({ open, onClose, sessionId, questions = [] }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [visible, setVisible] = useState(SNAPSHOTS_PER_PAGE);
  const [viewIndex, setViewIndex] = useState(null);

  useEffect(() => {
    if (!open || summary) return undefined;
    let cancelled = false;
    vivaService.getFaceSummary(sessionId)
      .then((s) => {
        if (cancelled) return;
        setSummary(s);
        setFilter(s.mismatches > 0 ? 'MISMATCH' : 'ALL');
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [open, sessionId, summary]);

  const qNumberById = useMemo(() => {
    const map = new Map();
    questions.forEach((q, i) => map.set(q.viva_question_id, i + 1));
    return map;
  }, [questions]);
  const qLabelFor = useCallback((c) => (c.viva_question_id != null && qNumberById.has(c.viva_question_id) ? `Q${qNumberById.get(c.viva_question_id)}` : null), [qNumberById]);

  const totalKept = useMemo(() => summary?.checks?.filter((c) => c.has_image).length || 0, [summary]);

  const snapshots = useMemo(() => {
    if (!summary) return [];
    return summary.checks
      .filter((c) => c.has_image && (filter === 'ALL' || c.status === 'MISMATCH'))
      .sort((a, b) => (a.status === 'MISMATCH') === (b.status === 'MISMATCH')
        ? new Date(a.created_at) - new Date(b.created_at)
        : (a.status === 'MISMATCH' ? -1 : 1));
  }, [summary, filter]);

  const changeFilter = (_, next) => {
    if (!next) return;
    setFilter(next);
    setVisible(SNAPSHOTS_PER_PAGE);
    setViewIndex(null);
  };

  const hasData = summary && (summary.reference_set || summary.total_checks > 0);
  const flagged = (summary?.mismatches || 0) > 0;
  const comparable = summary ? summary.matches + summary.mismatches : 0;
  const statusLabel = !summary
    ? ''
    : !summary.reference_set
      ? 'No reference photo'
      : comparable === 0 ? 'No comparisons yet'
        : flagged ? `${summary.mismatches} of ${comparable} did not match` : 'All checks matched';
  const statusColor = !summary || !summary.reference_set || comparable === 0 ? '#64748B' : flagged ? '#DC2626' : '#059669';

  const loading = !summary && !error;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 3 },
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: { xs: '100%', sm: 'min(86vh, 820px)' },
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 1.75, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${statusColor}1A`, color: statusColor }}>
          <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
            Identity Verification
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', display: { xs: 'none', sm: 'block' } }} noWrap>
            Camera snapshots compared with the photo taken at the start. For review only — it does not change the AI score.
          </Typography>
        </Box>
        {summary && hasData && (
          <Chip size="small" label={statusLabel} sx={{ fontWeight: 700, color: statusColor, bgcolor: `${statusColor}14`, border: `1px solid ${statusColor}40`, borderRadius: 1.5, display: { xs: 'none', sm: 'inline-flex' } }} />
        )}
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: '#64748B' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Body */}
      {loading ? (
        <Box sx={{ flex: 1, p: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 3 }}>
          <Skeleton variant="rounded" height={240} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1.5, alignContent: 'start' }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="rounded" height={150} />)}
          </Box>
        </Box>
      ) : error || !hasData ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, p: 4, textAlign: 'center' }}>
          <ImageNotSupportedOutlinedIcon sx={{ fontSize: 40, color: '#CBD5E1' }} />
          <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569' }}>
            {error ? 'Identity data could not be loaded.' : 'No identity data was recorded for this session.'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', maxWidth: 380 }}>
            {error ? 'Please close this window and try again.' : 'Face verification was off, or no reference photo was taken before the exam started.'}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' },
            gridTemplateRows: { xs: 'auto', md: 'minmax(0, 1fr)' },
            overflowY: { xs: 'auto', md: 'hidden' },
            ...scrollbarSx,
          }}
        >
          {/* Reference & stats */}
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              bgcolor: '#F8FAFC',
              borderRight: { md: '1px solid #E2E8F0' },
              borderBottom: { xs: '1px solid #E2E8F0', md: 'none' },
              overflowY: { md: 'auto' },
              ...scrollbarSx,
            }}
          >
            <SectionLabel>Reference photo</SectionLabel>
            <Box sx={{ mt: 0.75 }}>
              {summary.reference_set ? (
                <AuthImage sessionId={sessionId} alt="Reference photo taken at the start of the exam" sx={{ width: '100%', maxWidth: { xs: 280, md: 'none' }, aspectRatio: '4 / 3', borderRadius: 2, border: '1px solid #E2E8F0' }} />
              ) : (
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>None was taken for this session.</Typography>
              )}
            </Box>
            {summary.reference_at && (
              <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
                Taken {formatClock(summary.reference_at)}
              </Typography>
            )}

            <Box sx={{ mt: 2.5 }}>
              <SectionLabel>Summary</SectionLabel>
              <Box sx={{ mt: 0.75, display: 'grid', gridTemplateColumns: { xs: 'repeat(auto-fit, minmax(110px, 1fr))', md: '1fr 1fr' }, gap: 1 }}>
                <Stat label="Total checks" value={summary.total_checks} />
                <Stat label="Matched" value={summary.matches} color="#059669" />
                <Stat label="Did not match" value={summary.mismatches} color={flagged ? '#DC2626' : '#64748B'} />
                {summary.no_face > 0 && <Stat label="No face seen" value={summary.no_face} color="#64748B" />}
              </Box>
              {summary.min_similarity != null && (
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 1.25 }}>
                  Lowest similarity <strong>{summary.min_similarity.toFixed(2)}</strong> · match threshold <strong>{Number(summary.match_threshold).toFixed(2)}</strong>
                </Typography>
              )}
            </Box>
          </Box>

          {/* Snapshots */}
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', flexShrink: 0, borderBottom: '1px solid #F1F5F9', bgcolor: '#FFFFFF' }}>
              <Box>
                <SectionLabel>Snapshots</SectionLabel>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  All mismatches are kept, plus a sample of matches. Click one to enlarge.
                </Typography>
              </Box>
              {totalKept > 0 && (
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={filter}
                  onChange={changeFilter}
                  aria-label="Filter snapshots"
                  sx={{
                    bgcolor: '#F1F5F9',
                    '& .MuiToggleButton-root': {
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      px: 1.5,
                      py: 0.4,
                      color: '#64748B',
                      border: '1px solid #E2E8F0',
                      '&.Mui-selected': { bgcolor: '#FFFFFF', color: '#0F172A', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.1)' },
                      '&.Mui-selected:hover': { bgcolor: '#FFFFFF' },
                    },
                  }}
                >
                  <ToggleButton value="MISMATCH" sx={{ '&.Mui-selected': { color: summary.mismatches > 0 ? '#DC2626 !important' : undefined } }}>
                    Mismatches{summary.mismatches > 0 ? ` (${summary.mismatches})` : ''}
                  </ToggleButton>
                  <ToggleButton value="ALL">All ({totalKept})</ToggleButton>
                </ToggleButtonGroup>
              )}
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflowY: { md: 'auto' }, p: { xs: 2, sm: 2.5 }, ...scrollbarSx }}>
              {snapshots.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: 2, border: '1px dashed #CBD5E1' }}>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>
                    {filter === 'MISMATCH' ? 'No mismatching snapshots recorded — every comparison matched.' : 'No snapshots were saved for this session.'}
                  </Typography>
                  {filter === 'MISMATCH' && totalKept > 0 && (
                    <Button size="small" onClick={() => changeFilter(null, 'ALL')} sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}>
                      View all {totalKept} snapshots
                    </Button>
                  )}
                </Box>
              ) : (
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1.5 }}>
                    {snapshots.slice(0, visible).map((c, i) => (
                      <SnapshotTile key={c.id} sessionId={sessionId} check={c} qLabel={qLabelFor(c)} onOpen={() => setViewIndex(i)} />
                    ))}
                  </Box>
                  {visible < snapshots.length && (
                    <Stack sx={{ alignItems: 'center', mt: 2 }}>
                      <Button variant="outlined" size="small" onClick={() => setVisible((v) => v + SNAPSHOTS_PER_PAGE)} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                        Show {Math.min(SNAPSHOTS_PER_PAGE, snapshots.length - visible)} more ({snapshots.length - visible} remaining)
                      </Button>
                    </Stack>
                  )}
                </>
              )}
            </Box>
          </Box>
        </Box>
      )}

      <SnapshotViewer
        sessionId={sessionId}
        snapshots={snapshots}
        index={viewIndex}
        onIndexChange={setViewIndex}
        onClose={() => setViewIndex(null)}
        referenceSet={Boolean(summary?.reference_set)}
        threshold={summary?.match_threshold}
        qLabelFor={qLabelFor}
      />
    </Dialog>
  );
}
