import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { useAuth } from '@/store/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.must_change_password) {
        navigate('/change-password', { replace: true });
      } else if (user.role === 'TRAINEE') {
        navigate('/welcome', { replace: true });
      } else {
        navigate('/hr/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      if (data.must_change_password) {
        navigate('/change-password', { replace: true });
        return;
      }
      const from = location.state?.from?.pathname;

      if (from && from !== '/') {
        navigate(from, { replace: true });
      } else if (data.role === 'TRAINEE') {
        navigate('/welcome', { replace: true });
      } else {
        navigate('/hr/dashboard', { replace: true });
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many login attempts. Please try again in a minute.');
      } else {
        setError(err.response?.data?.detail || 'Invalid username or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', flexDirection: { xs: 'column', lg: 'row' }, bgcolor: '#131C2E' }}>
      
      {/* ─── Left Side: Clean, Spacious Product Showcase ─── */}
      <Box
        sx={{
          width: { xs: '100%', lg: '58%', xl: '60%' },
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { lg: 6, xl: 8 },
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#131C2E',
          color: '#FFFFFF',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundImage: `
            radial-gradient(ellipse 70% 55% at 20% 20%, rgba(242, 101, 34, 0.15) 0%, transparent 65%),
            radial-gradient(circle at 85% 75%, rgba(56, 189, 248, 0.08) 0%, transparent 55%)
          `,
        }}
      >
        {/* Top Brand Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, zIndex: 1 }}>
          <Box
            component="img"
            src="/ae-icon.png"
            alt="AutomationEdge"
            sx={{ height: 28, width: 'auto', objectFit: 'contain' }}
          />
          <Typography variant="h6" sx={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: '-0.01em', fontSize: '1.1rem' }}>
            Viva Copilot
          </Typography>
        </Box>

        {/* Center: Spacious, Minimalist Value Narrative */}
        <Box sx={{ my: 'auto', maxWidth: 520, zIndex: 1 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              fontSize: { lg: '2.2rem', xl: '2.6rem' },
              lineHeight: 1.25,
              letterSpacing: '-0.03em',
              color: '#F8FAFC',
              mb: 2.5,
            }}
          >
            Intelligent viva evaluations,{' '}
            <Box component="span" sx={{ color: 'primary.main' }}>
              delivered with precision.
            </Box>
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: '#94A3B8',
              lineHeight: 1.65,
              fontSize: '1rem',
              mb: 4.5,
            }}
          >
            Streamline your technical assessment pipelines with automated spoken viva interviews, calibrated depth scoring, and objective candidate analytics.
          </Typography>

          {/* Minimalist 3-Column Capability Row */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 3,
              pt: 4,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {[
              {
                step: '01',
                title: 'Spoken Viva',
                desc: 'Real-time conversational voice evaluation',
              },
              {
                step: '02',
                title: 'Depth Scoring',
                desc: 'Calibrated technical mastery metrics',
              },
              {
                step: '03',
                title: 'Integrity',
                desc: 'Continuous proctoring & gaze verification',
              },
            ].map((col, idx) => (
              <Box
                key={col.step}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  pr: idx < 2 ? 2 : 0,
                  borderRight: idx < 2 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    color: 'primary.main',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}
                >
                  {col.step}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: '#F8FAFC',
                    fontSize: '0.92rem',
                    }}
                >
                  {col.title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#94A3B8',
                    lineHeight: 1.45,
                    fontSize: '0.78rem',
                    }}
                >
                  {col.desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
            pt: 3,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.75rem' }}>
            &copy; 2026 AutomationEdge Technologies &bull; All rights reserved
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4ade80' }} />
            <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: 500 }}>
              All systems operational
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ─── Right Side: Focused Login Form ─── */}
      <Box
        sx={{
          width: { xs: '100%', lg: '42%', xl: '40%' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 3, sm: 6, lg: 5, xl: 7 },
          py: { xs: 6, lg: 6 },
          bgcolor: '#FFFFFF',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          
          {/* Official AutomationEdge Logo Header */}
          <Box sx={{ mb: 3.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Box
              component="img"
              src="/ae-full-logo.png"
              alt="AutomationEdge"
              sx={{
                height: 38,
                width: 'auto',
                objectFit: 'contain',
                mb: 2.5,
              }}
            />
            <Box sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                Viva Copilot
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary'}}>
              Sign in with your work credentials to access your session.
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                fontSize: '0.85rem',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                '& .MuiAlert-icon': { color: '#ef4444' },
              }}
            >
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleLogin} noValidate>
            <Stack spacing={2.5}>
              <Box>
                <Typography
                  component="label"
                  htmlFor="username-input"
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 0.75,
                    fontWeight: 600,
                    color: '#334155',
                    fontSize: '0.825rem',
                  }}
                >
                  Username or Work Email
                </Typography>
                <TextField
                  id="username-input"
                  fullWidth
                  placeholder="name@company.com"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutlinedIcon sx={{ fontSize: 19, color: '#94A3B8' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#F8FAFC',
                      borderRadius: 2,
                      fontSize: '0.925rem',
                      transition: 'all 0.18s ease',
                      '& fieldset': {
                        borderColor: '#E2E8F0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#CBD5E1',
                      },
                      '&.Mui-focused': {
                        bgcolor: '#FFFFFF',
                        boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.12)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main',
                        borderWidth: '1.5px',
                      },
                    },
                  }}
                />
              </Box>

              <Box>
                <Typography
                  component="label"
                  htmlFor="password-input"
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 0.75,
                    fontWeight: 600,
                    color: '#334155',
                    fontSize: '0.825rem',
                  }}
                >
                  Password
                </Typography>
                <TextField
                  id="password-input"
                  fullWidth
                  placeholder="••••••••••••"
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ fontSize: 19, color: '#94A3B8' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          edge="end"
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          sx={{ color: '#94A3B8', '&:hover': { color: '#475569' } }}
                        >
                          {showPassword ? <VisibilityOutlinedIcon sx={{ fontSize: 18 }} /> : <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#F8FAFC',
                      borderRadius: 2,
                      fontSize: '0.925rem',
                      transition: 'all 0.18s ease',
                      '& fieldset': {
                        borderColor: '#E2E8F0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#CBD5E1',
                      },
                      '&.Mui-focused': {
                        bgcolor: '#FFFFFF',
                        boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.12)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main',
                        borderWidth: '1.5px',
                      },
                    },
                  }}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading}
                sx={{
                  py: 1.35,
                  fontWeight: 600,
                  mt: 1,
                  borderRadius: 2,
                  fontSize: '0.95rem',
                  color: '#FFFFFF',
                  background: 'linear-gradient(135deg, #F26522 0%, #EA580C 100%)',
                  boxShadow: '0 2px 8px rgba(242, 101, 34, 0.22)',
                  '&:hover': {
                    color: '#FFFFFF',
                    background: 'linear-gradient(135deg, #EA580C 0%, #D9531E 100%)',
                    boxShadow: '0 4px 14px rgba(242, 101, 34, 0.32)',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(242, 101, 34, 0.65)',
                    color: '#FFFFFF',
                    boxShadow: 'none',
                  },
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#FFFFFF' }}>
                    <CircularProgress size={18} sx={{ color: '#FFFFFF' }} thickness={4} />
                    <span style={{ color: '#FFFFFF' }}>Signing In...</span>
                  </Box>
                ) : (
                  <span style={{ color: '#FFFFFF' }}>Sign In</span>
                )}
              </Button>
            </Stack>
          </Box>

          {/* Security Footnote */}
          <Box
            sx={{
              mt: 4.5,
              pt: 2.5,
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              color: '#94A3B8',
            }}
          >
            <ShieldOutlinedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
              End-to-end encrypted session &bull; Role-based access
            </Typography>
          </Box>

        </Box>
      </Box>

    </Box>
  );
}

