import { useState } from 'react';
import { Box, Popover, Typography, IconButton, ButtonBase } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateStr(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function buildCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

/** Compact popover date picker matching the app's brand palette — a nicer,
 * theme-consistent alternative to the native <input type="date"> calendar. */
export default function MiniCalendarPicker({ label, value, onChange, minDate, maxDate }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const selectedDate = parseDateStr(value);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  const open = Boolean(anchorEl);
  const todayStr = toDateStr(new Date());
  const minD = minDate ? parseDateStr(minDate) : null;
  const maxD = maxDate ? parseDateStr(maxDate) : null;

  const handleOpen = (e) => {
    setViewDate(selectedDate || new Date());
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);

  const days = buildCalendarDays(viewDate);
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isDisabled = (d) => (minD && d < minD) || (maxD && d > maxD);

  return (
    <>
      <ButtonBase
        onClick={handleOpen}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.9,
          borderRadius: 2, border: `1px solid ${open ? '#F26522' : '#E2E8F0'}`, bgcolor: '#FFFFFF',
          fontSize: '0.8rem', fontWeight: 600, color: value ? '#0F172A' : '#94A3B8',
          minWidth: 140, justifyContent: 'flex-start',
          transition: 'border-color 0.15s ease',
          '&:hover': { borderColor: '#CBD5E1' },
        }}
      >
        <CalendarTodayIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
        {selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (label || 'Select date')}
      </ButtonBase>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 0.75, borderRadius: 2.5, boxShadow: '0 12px 32px rgba(0,0,0,0.12)', border: '1px solid #E2E8F0' } } }}
      >
        <Box sx={{ p: 2, width: 288 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <IconButton
              size="small"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              sx={{ color: '#64748B', '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.08)', color: '#F26522' } }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A' }}>
              {monthLabel}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              sx={{ color: '#64748B', '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.08)', color: '#F26522' } }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
            {WEEKDAYS.map((w, i) => (
              <Typography key={i} align="center" sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8' }}>
                {w}
              </Typography>
            ))}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25 }}>
            {days.map((d, i) => {
              const inMonth = d.getMonth() === viewDate.getMonth();
              const dStr = toDateStr(d);
              const isSelected = value === dStr;
              const isToday = dStr === todayStr;
              const disabled = isDisabled(d);
              return (
                <ButtonBase
                  key={i}
                  disabled={disabled}
                  onClick={() => { onChange(dStr); handleClose(); }}
                  sx={{
                    height: 32, borderRadius: '50%', fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    color: disabled ? '#E2E8F0' : isSelected ? '#FFFFFF' : inMonth ? '#0F172A' : '#CBD5E1',
                    bgcolor: isSelected ? '#F26522' : 'transparent',
                    border: isToday && !isSelected ? '1px solid #F26522' : '1px solid transparent',
                    transition: 'all 0.12s ease',
                    '&:hover': !disabled ? { bgcolor: isSelected ? '#e9591a' : 'rgba(242, 101, 34, 0.08)' } : {},
                  }}
                >
                  {d.getDate()}
                </ButtonBase>
              );
            })}
          </Box>
        </Box>
      </Popover>
    </>
  );
}
