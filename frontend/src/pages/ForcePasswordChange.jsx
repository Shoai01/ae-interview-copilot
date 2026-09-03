import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
  Stack,
  Alert
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/AuthContext';
import { authService } from '@/services/api';

export default function ForcePasswordChange() {
  const navigate = useNavigate();
  const { user, setMustChangePassword, logout } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!oldPassword) {
      setErrorMsg('Please enter your temporary/current password.');
      return;
    }

    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    if (newPassword === oldPassword) {
      setErrorMsg('New password must be different from your current temporary password.');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      toast.success('Password changed successfully! Redirecting...');

      if (setMustChangePassword) {
        setMustChangePassword(false);
      }

      if (user?.role === 'TRAINEE') {
        navigate('/welcome', { replace: true });
      } else {
        navigate('/hr/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update password. Please verify your temporary password.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isLengthValid = newPassword.length >= 4;
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#131C2E',
        px: { xs: 2, sm: 3 },
        py: 4,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background ambient radial gradients */}
      <Box
        sx={{
          position: 'absolute',
          top: '-15%',
          right: '-10%',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(242, 101, 34, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-15%',
          left: '-10%',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />

      {/* Centered Card */}
      <Card
        elevation={0}
        sx={{
          maxWidth: 460,
          width: '100%',
          p: { xs: 3.5, sm: 4.5 },
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          zIndex: 1,
          bgcolor: '#FFFFFF'
        }}
      >
        {/* Brand Banner */}
        <Box sx={{ mb: 3.5, textAlign: 'center' }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 2.5,
              bgcolor: 'rgba(242, 101, 34, 0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              color: '#F26522'
            }}
          >
            <KeyOutlinedIcon sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', mb: 1 }}>
            Reset Password
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.5 }}>
            Welcome, <strong>{user?.full_name || user?.username}</strong>! For your account security, please update your temporary credentials before continuing.
          </Typography>
        </Box>

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2}}>
            {errorMsg}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            {/* Current Password Field */}
            <Box>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontWeight: 600, color: '#334155'}}>
                Temporary / Current Password *
              </Typography>
              <TextField
                fullWidth
                required
                placeholder="Enter current password"
                type={showOldPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: '#94A3B8', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                      >
                        {showOldPassword ? (
                          <VisibilityOutlinedIcon sx={{ color: '#64748B', fontSize: 18 }} />
                        ) : (
                          <VisibilityOffOutlinedIcon sx={{ color: '#64748B', fontSize: 18 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#F8FAFC',
                    borderRadius: 2,
                    '& fieldset': { borderColor: '#E2E8F0' },
                    '&:hover fieldset': { borderColor: '#CBD5E1' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '1.5px' },
                  }
                }}
              />
            </Box>

            {/* New Password Field */}
            <Box>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontWeight: 600, color: '#334155'}}>
                New Password *
              </Typography>
              <TextField
                fullWidth
                required
                placeholder="Enter new password (min. 4 characters)"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ShieldOutlinedIcon sx={{ color: '#94A3B8', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <VisibilityOutlinedIcon sx={{ color: '#64748B', fontSize: 18 }} />
                        ) : (
                          <VisibilityOffOutlinedIcon sx={{ color: '#64748B', fontSize: 18 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#F8FAFC',
                    borderRadius: 2,
                    '& fieldset': { borderColor: '#E2E8F0' },
                    '&:hover fieldset': { borderColor: '#CBD5E1' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '1.5px' },
                  }
                }}
              />
            </Box>

            {/* Confirm New Password Field */}
            <Box>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontWeight: 600, color: '#334155'}}>
                Confirm New Password *
              </Typography>
              <TextField
                fullWidth
                required
                placeholder="Re-enter new password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ShieldOutlinedIcon sx={{ color: '#94A3B8', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <VisibilityOutlinedIcon sx={{ color: '#64748B', fontSize: 18 }} />
                        ) : (
                          <VisibilityOffOutlinedIcon sx={{ color: '#64748B', fontSize: 18 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#F8FAFC',
                    borderRadius: 2,
                    '& fieldset': { borderColor: '#E2E8F0' },
                    '&:hover fieldset': { borderColor: '#CBD5E1' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '1.5px' },
                  }
                }}
              />
            </Box>

            {/* Password Validation Hints */}
            <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <CheckCircleOutlinedIcon sx={{ fontSize: 16, color: isLengthValid ? '#16A34A' : '#94A3B8' }} />
                <Typography variant="caption" sx={{ color: isLengthValid ? '#16A34A' : '#64748B', fontWeight: isLengthValid ? 600 : 400}}>
                  At least 4 characters long
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleOutlinedIcon sx={{ fontSize: 16, color: isMatchValid ? '#16A34A' : '#94A3B8' }} />
                <Typography variant="caption" sx={{ color: isMatchValid ? '#16A34A' : '#64748B', fontWeight: isMatchValid ? 600 : 400}}>
                  New passwords match
                </Typography>
              </Box>
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || !isLengthValid || !isMatchValid}
              sx={{
                py: 1.3,
                fontWeight: 700,
                mt: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '0.95rem',
                background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
                color: '#FFFFFF !important',
                boxShadow: '0 4px 14px rgba(242, 101, 34, 0.35)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(242, 101, 34, 0.45)',
                },
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Update Password & Enter'}
            </Button>

            {/* Sign out link option */}
            <Box sx={{ textAlign: 'center', pt: 0.5 }}>
              <Button
                variant="text"
                size="small"
                onClick={logout}
                disabled={loading}
                sx={{
                  color: '#64748B',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    color: '#0F172A',
                    bgcolor: 'transparent',
                    textDecoration: 'underline'
                  }
                }}
              >
                Sign out and return to login
              </Button>
            </Box>
          </Stack>
        </form>
      </Card>
    </Box>
  );
}
