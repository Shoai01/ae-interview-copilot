import { useEffect, useMemo, useState } from 'react';
import { Box, Card, Chip, Stack, Typography, Button, Skeleton, Tooltip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import FaceRetouchingNaturalOutlinedIcon from '@mui/icons-material/FaceRetouchingNaturalOutlined';
import { vivaService } from '@/services/api';

const SNAPSHOTS_PER_PAGE = 8;

const STATUS_COLOR = { MATCH: '#10B981', MISMATCH: '#EF4444', NO_FACE: '#94A3B8' };
const STATUS_LABEL = { MATCH: 'Matched', MISMATCH: 'Did not match', NO_FACE: 'No face' };

function formatClock(iso) {
  // Backend timestamps are naive UTC.
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

// <img> can't send the auth header, so images are fetched as blobs.
function AuthImage({ sessionId, checkId = null, alt, sx }) {
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
  return <Box component="img" src={url} alt={alt} sx={{ ...sx, objectFit: 'cover', display: 'block' }} />;
}

function Stat({ label, value, color = '#0F172A' }) {
  return (
    <Box sx={{ minWidth: 90 }}>
      <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: '#64748B' }}>{label}</Typography>
    </Box>
  );
}

/**
 * Trainer-side identity review for one session: the reference photo taken at
 * the start, how every periodic camera snapshot compared with it, and the
 * snapshots the server kept (all mismatches plus a sample of matches).
 * Scores are for the trainer's judgement only — they never change the AI score.
 */
export default function FaceVerificationPanel({ sessionId }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('MISMATCH');
  const [visible, setVisible] = useState(SNAPSHOTS_PER_PAGE);

  useEffect(() => {
    let cancelled = false;
    vivaService.getFaceSummary(sessionId)
      .then((s) => { if (!cancelled) setSummary(s); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [sessionId]);

  const snapshots = useMemo(() => {
    if (!summary) return [];
    return summary.checks
      .filter((c) => c.has_image && (filter === 'ALL' || c.status === 'MISMATCH'))
      .sort((a, b) => (a.status === 'MISMATCH') === (b.status === 'MISMATCH')
        ? new Date(a.created_at) - new Date(b.created_at)
        : (a.status === 'MISMATCH' ? -1 : 1));
  }, [summary, filter]);

  if (error || !summary) return null;
  // Feature was off, or the reference was never taken: nothing to review.
  if (!summary.reference_set && summary.total_checks === 0) return null;

  const flagged = summary.mismatches > 0;
  const comparable = summary.matches + summary.mismatches;
  const statusLabel = !summary.reference_set
    ? 'No reference photo'
    : comparable === 0 ? 'No comparisons yet'
      : flagged ? `${summary.mismatches} of ${comparable} did not match` : 'All checks matched';
  const statusColor = !summary.reference_set || comparable === 0 ? '#64748B' : flagged ? '#DC2626' : '#059669';

  return (
    <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
      <Box sx={{ px: 2.25, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, borderBottom: '1px solid #F1F5F9' }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box sx={{ width: 34, height: 34, borderRadius: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${statusColor}1A`, color: statusColor }}>
            <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', fontSize: '1.02rem', lineHeight: 1.2 }}>
              Identity Verification
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
              Camera snapshots compared with the photo taken at the start. For review only — it does not change the AI score.
            </Typography>
          </Box>
        </Stack>
        <Chip size="small" label={statusLabel} sx={{ fontWeight: 700, color: statusColor, bgcolor: `${statusColor}14`, border: `1px solid ${statusColor}40`, borderRadius: 1.5 }} />
      </Box>

      <Box sx={{ p: 2.25, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '200px 1fr' }, gap: 3 }}>
        {/* Reference photo */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.75 }}>
            Reference photo
          </Typography>
          {summary.reference_set ? (
            <AuthImage sessionId={sessionId} alt="Reference photo taken at the start of the exam" sx={{ width: '100%', maxWidth: 200, aspectRatio: '4 / 3', borderRadius: 1.5, border: '1px solid #E2E8F0' }} />
          ) : (
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>None was taken for this session.</Typography>
          )}
          {summary.reference_at && (
            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
              Taken {formatClock(summary.reference_at)}
            </Typography>
          )}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Stat label="Checks" value={summary.total_checks} />
            <Stat label="Matched" value={summary.matches} color="#059669" />
            <Stat label="Did not match" value={summary.mismatches} color={flagged ? '#DC2626' : '#0F172A'} />
            <Stat label="No face seen" value={summary.no_face} color="#64748B" />
            <Stat label="Lowest similarity" value={summary.min_similarity == null ? '—' : summary.min_similarity.toFixed(2)} />
          </Stack>

          {/* One bar per check, in time order; height = similarity to the reference. */}
          {summary.checks.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '2px', height: 48, borderBottom: '1px solid #E2E8F0' }}>
                <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: `${Math.max(0, Math.min(1, summary.match_threshold)) * 100}%`, borderTop: '1px dashed #CBD5E1' }} />
                {summary.checks.map((c) => (
                  <Tooltip key={c.id} arrow title={`${formatClock(c.created_at)} · ${STATUS_LABEL[c.status] || c.status}${c.similarity != null ? ` · ${c.similarity.toFixed(2)}` : ''}`}>
                    <Box sx={{ flex: '1 1 0', minWidth: 3, maxWidth: 14, height: c.similarity == null ? '8%' : `${Math.max(4, Math.min(100, c.similarity * 100))}%`, bgcolor: STATUS_COLOR[c.status] || '#94A3B8', borderRadius: '2px 2px 0 0', opacity: c.status === 'NO_FACE' ? 0.5 : 1 }} />
                  </Tooltip>
                ))}
              </Box>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Dashed line = match threshold ({summary.match_threshold.toFixed(2)}). Grey bars: no face was visible.
              </Typography>
            </Box>
          )}

          {/* Kept snapshots */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Snapshots
            </Typography>
            <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => { if (v) { setFilter(v); setVisible(SNAPSHOTS_PER_PAGE); } }}>
              <ToggleButton value="MISMATCH" sx={{ textTransform: 'none', px: 1.5, py: 0.25, fontSize: '0.75rem' }}>Mismatches</ToggleButton>
              <ToggleButton value="ALL" sx={{ textTransform: 'none', px: 1.5, py: 0.25, fontSize: '0.75rem' }}>All kept</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {snapshots.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              {filter === 'MISMATCH' ? 'No mismatching snapshots were captured.' : 'No snapshots were kept.'}
            </Typography>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1.25 }}>
                {snapshots.slice(0, visible).map((c) => (
                  <Box key={c.id}>
                    <Box sx={{ border: `2px solid ${STATUS_COLOR[c.status]}`, borderRadius: 1.5, overflow: 'hidden' }}>
                      <AuthImage
                        sessionId={sessionId}
                        checkId={c.id}
                        alt={`Snapshot at ${formatClock(c.created_at)}`}
                        sx={{ width: '100%', aspectRatio: '4 / 3' }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
                      {formatClock(c.created_at)} · {c.similarity != null ? c.similarity.toFixed(2) : '—'}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {visible < snapshots.length && (
                <Button size="small" onClick={() => setVisible((v) => v + SNAPSHOTS_PER_PAGE)} sx={{ mt: 1.5, textTransform: 'none', fontWeight: 600 }}>
                  Show {Math.min(SNAPSHOTS_PER_PAGE, snapshots.length - visible)} more ({snapshots.length - visible} remaining)
                </Button>
              )}
            </>
          )}
        </Box>
      </Box>
    </Card>
  );
}
