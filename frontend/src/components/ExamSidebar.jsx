import React, { useEffect, useRef } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import CheckIcon from '@mui/icons-material/Check';

// r=58 ring (see the SVG below) has this circumference; the dash offset is
// derived from the live time-remaining ratio to draw a depleting arc.
const RING_RADIUS = 58;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Persistent left rail for the exam screen: identity, a large countdown
// ring, and a vertical question-by-question progress list. Keeping the list
// in its own flexed, internally-scrolling region is what lets this scale
// from 5 questions to 30+ without numbers shrinking or the rail overflowing
// the viewport — only the list scrolls, the header/timer/footer stay put.
const ExamSidebar = React.memo(function ExamSidebar({
  traineeName,
  moduleName,
  durationMinutes,
  currentIndex,
  total,
  timerMinutes,
  timerSecs,
  timerAccentColor,
  timerTrackColor,
  timeRatio,
  timerExpired,
  timerWarning,
}) {
  const hasProgress = Boolean(total && currentIndex);
  const attemptedCount = hasProgress ? Math.max(0, currentIndex - 1) : 0;
  const remainingCount = hasProgress ? Math.max(0, total - currentIndex) : 0;
  const initials = (traineeName || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

  const ringDashOffset = RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, timeRatio || 0)));

  const currentItemRef = useRef(null);
  useEffect(() => {
    currentItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [currentIndex]);

  return (
    <Box
      component="nav"
      aria-label="Exam identity and progress"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 296,
        flexShrink: 0,
        bgcolor: '#FFFFFF',
        borderRight: '1px solid #E9EDF3',
        boxShadow: '6px 0 20px -12px rgba(15, 23, 42, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 24px',
        gap: '26px',
        zIndex: 40,
      }}
    >
      {/* Branding */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, flexShrink: 0 }}>
        <Box component="img" src="/ae-icon.png" alt="AutomationEdge" sx={{ height: 28, width: 'auto' }} />
        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#0A1628' }}>Viva Copilot</Typography>
      </Box>

      <Box sx={{ height: '1px', bgcolor: '#EEF1F5', flexShrink: 0 }} />

      {/* Trainee */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff8c42, #F26522)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '1rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#0A1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {traineeName}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>Trainee</Typography>
        </Box>
      </Box>

      {/* Module */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.85,
          bgcolor: 'rgba(242, 101, 34, 0.08)',
          border: '1px solid rgba(242, 101, 34, 0.24)',
          py: 1.1,
          borderRadius: 2,
          flexShrink: 0,
        }}
      >
        <CodeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {moduleName} Module
        </Typography>
      </Box>

      <Box sx={{ height: '1px', bgcolor: '#EEF1F5', flexShrink: 0 }} />

      {/* Countdown ring */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
        <Box sx={{ position: 'relative', width: 132, height: 132, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={132} height={132} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
            <circle cx={66} cy={66} r={RING_RADIUS} fill="none" stroke={timerTrackColor} strokeWidth={7} />
            <circle
              cx={66}
              cy={66}
              r={RING_RADIUS}
              fill="none"
              stroke={timerAccentColor}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringDashOffset}
              style={{ transition: 'stroke-dashoffset 0.85s linear, stroke 0.3s ease' }}
            />
          </svg>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: '#0A1628', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {timerMinutes}:{timerSecs}
            </Typography>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: timerAccentColor, mt: 0.4 }}>
              {timerExpired ? 'Time up' : timerWarning ? 'Almost up' : 'Remaining'}
            </Typography>
          </Box>
        </Box>
        <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
          Session duration &middot; {durationMinutes} min
        </Typography>
      </Box>

      <Box sx={{ height: '1px', bgcolor: '#EEF1F5', flexShrink: 0 }} />

      {/* Vertical progress list — flexes to fill remaining height and
          scrolls internally, so 30+ questions never shrink or overflow. */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.75, flexShrink: 0 }}>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>
            Progress
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#0A1628' }}>
            {hasProgress ? `${currentIndex} / ${total}` : '—'}
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            maskImage: 'linear-gradient(#000 92%, transparent)',
            WebkitMaskImage: 'linear-gradient(#000 92%, transparent)',
            '&::-webkit-scrollbar': { width: 5 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 3 },
          }}
        >
          {hasProgress ? (
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ position: 'absolute', left: 14, top: 6, bottom: 6, width: '2px', bgcolor: '#E9EDF3' }} />
              <Box
                sx={{
                  position: 'absolute',
                  left: 14,
                  top: 6,
                  width: '2px',
                  height: `${Math.max(0, (currentIndex - 1)) * 44 + (currentIndex > 1 ? 22 : 0)}px`,
                  bgcolor: '#22C55E',
                  transition: 'height 0.3s ease',
                }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {Array.from({ length: total }, (_, i) => i + 1).map((num) => {
                  const isAttempted = num < currentIndex;
                  const isCurrent = num === currentIndex;
                  return (
                    <Tooltip key={num} title={isCurrent ? 'Current question' : isAttempted ? 'Attempted' : 'Not yet reached'} arrow placement="right">
                      <Box
                        ref={isCurrent ? currentItemRef : null}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: 44, position: 'relative' }}
                      >
                        <Box
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            flexShrink: 0,
                            zIndex: 1,
                            transition: 'all 0.2s ease',
                            ...(isCurrent
                              ? { background: 'linear-gradient(135deg, #ff8c42, #F26522)', boxShadow: '0 3px 10px rgba(242, 101, 34, 0.45)', color: '#FFFFFF' }
                              : isAttempted
                              ? { bgcolor: '#22C55E', color: '#FFFFFF' }
                              : { bgcolor: '#FFFFFF', border: '1.5px solid #E2E8F0', color: '#94A3B8' }),
                          }}
                        >
                          {isAttempted ? <CheckIcon sx={{ fontSize: 14 }} /> : num}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: isCurrent ? '0.85rem' : '0.8rem',
                            fontWeight: isCurrent ? 800 : 600,
                            color: isCurrent ? '#F26522' : isAttempted ? '#334155' : '#94A3B8',
                          }}
                        >
                          Question {num}
                        </Typography>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          ) : (
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8' }}>Preparing your questions...</Typography>
          )}
        </Box>
      </Box>

      {/* Summary footer */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, pt: 0.75, borderTop: '1px solid #EEF1F5', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#16A34A' }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22C55E' }} />
          {attemptedCount} attempted
        </Box>
        <Box sx={{ color: '#64748B' }}>{remainingCount} remaining</Box>
      </Box>
    </Box>
  );
});

export default ExamSidebar;
