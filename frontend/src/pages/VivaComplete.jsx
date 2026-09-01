import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Divider, CircularProgress, Button, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import FormatListNumberedOutlinedIcon from '@mui/icons-material/FormatListNumberedOutlined';
import { useLocation, useNavigate } from 'react-router-dom';
import { vivaService } from '@/services/api';
import { useAuth } from '@/store/AuthContext';

export default function VivaComplete() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  // Restore completed session info from location.state or sessionStorage
  const getInitialCompletionData = () => {
    if (location.state?.sessionId) {
      const data = {
        sessionId: location.state.sessionId,
        timeExpired: Boolean(location.state.timeExpired)
      };
      try {
        sessionStorage.setItem('last_completed_viva_session', JSON.stringify(data));
      } catch {}
      return data;
    }
    try {
      const saved = sessionStorage.getItem('last_completed_viva_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  };

  const [completionInfo, setCompletionInfo] = useState(getInitialCompletionData);
  const sessionId = completionInfo.sessionId;
  const timeExpired = completionInfo.timeExpired;
  
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      // Fallback: Check if user has an active/completed session from server
      vivaService.getCurrentSession().then((session) => {
        if (session && session.id) {
          const recovered = {
            sessionId: session.id,
            timeExpired: false
          };
          try {
            sessionStorage.setItem('last_completed_viva_session', JSON.stringify(recovered));
          } catch {}
          setCompletionInfo(recovered);
        } else {
          navigate('/');
        }
      }).catch(() => {
        navigate('/');
      });
      return;
    }

    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await vivaService.getSessionSummary(sessionId);
        setSummary(data);
      } catch (err) {
        console.error("Failed to fetch session summary:", err);
        setError("Could not load session details.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [sessionId, navigate]);

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '0m 0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('last_completed_viva_session');
    } catch {}
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8FAFC', gap: 2 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
        <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
          Finalizing interview record...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8FAFC', gap: 2, p: 3 }}>
        <Typography sx={{ color: '#DC2626', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>{error}</Typography>
        <Button variant="outlined" onClick={handleLogout} sx={{ borderRadius: 2, textTransform: 'none', color: '#0F172A', borderColor: '#E2E8F0' }}>
          Return to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#F8FAFC',
        backgroundImage: 'radial-gradient(circle at 50% 15%, rgba(242, 101, 34, 0.08) 0%, transparent 60%)',
      }}
    >
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

      {/* Main Submission Card */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2.5, md: 4 },
        }}
      >
        <Card
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 580,
            borderRadius: 3,
            border: '1px solid #E2E8F0',
            boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.08)',
            bgcolor: '#FFFFFF',
            animation: 'slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            '@keyframes slideUpFade': {
              '0%': { opacity: 0, transform: 'translateY(24px)' },
              '100%': { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          <CardContent
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              p: { xs: 3.5, md: 5 },
              '&:last-child': { pb: { xs: 3.5, md: 5 } },
            }}
          >
            {/* Animated Success Badge */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 44, color: '#16A34A' }} />
            </Box>

            {/* Headlines */}
            <Chip
              label={timeExpired ? "TIME LIMIT REACHED • CONCLUDED" : "EXAMINATION CONCLUDED"}
              size="small"
              sx={{
                bgcolor: timeExpired ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.08)',
                color: timeExpired ? '#D97706' : '#16A34A',
                border: `1px solid ${timeExpired ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.25)'}`,
                fontWeight: 700,
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
                borderRadius: 1.5,
                px: 1,
                mb: 1.5,
                fontFamily: 'DM Sans, sans-serif',
              }}
            />

            <Typography
              variant="h4"
              sx={{
                color: '#0F172A',
                mb: 1.5,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                fontFamily: 'Syne, sans-serif',
                fontSize: { xs: '1.5rem', md: '1.85rem' },
              }}
            >
              Viva Assessment Submitted
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: '#64748B',
                lineHeight: 1.6,
                fontFamily: 'DM Sans, sans-serif',
                maxWidth: 460,
                fontSize: '0.9rem',
                mb: 4,
              }}
            >
              {timeExpired 
                ? "Your session reached its allotted duration and was automatically finalized. Your spoken responses and telemetry have been recorded for evaluation."
                : "Your spoken responses and video session telemetry have been recorded. Your trainer and evaluator will review your performance report shortly."}
            </Typography>

            {/* Session Stats Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2.5,
                width: '100%',
                maxWidth: 380,
                mb: 4,
              }}
            >
              <Box
                sx={{
                  bgcolor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 2,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <TimerOutlinedIcon sx={{ fontSize: 20, color: 'primary.main', mb: 0.75 }} />
                <Typography
                  sx={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    lineHeight: 1.1,
                  }}
                >
                  {summary ? formatDuration(summary.duration_seconds) : '—'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748B',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    mt: 0.5,
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Duration
                </Typography>
              </Box>

              <Box
                sx={{
                  bgcolor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 2,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <FormatListNumberedOutlinedIcon sx={{ fontSize: 20, color: '#0EA5E9', mb: 0.75 }} />
                <Typography
                  sx={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    lineHeight: 1.1,
                  }}
                >
                  {summary ? `${summary.questions_answered}/${summary.total_questions}` : '—'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748B',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    mt: 0.5,
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Questions
                </Typography>
              </Box>
            </Box>

            {/* Finish Action */}
            <Button
              variant="contained"
              onClick={handleLogout}
              sx={{
                background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
                color: '#FFFFFF !important',
                borderRadius: 2,
                px: 4.5,
                py: 1.3,
                fontWeight: 700,
                fontSize: '0.95rem',
                fontFamily: 'DM Sans, sans-serif',
                textTransform: 'none',
                boxShadow: '0 4px 20px rgba(242, 101, 34, 0.35)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 6px 25px rgba(242, 101, 34, 0.45)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              Sign Out & Return Home
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
