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
  CircularProgress
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!oldPassword) {
      toast.error('Please enter your current password');
      return;
    }

    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 4) {
      toast.error('Password must be at least 4 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      toast.success('Password changed successfully');

      // Update AuthContext state
      if (setMustChangePassword) {
        setMustChangePassword(false);
      }

      // Redirect user to their designated dashboard
      if (user?.role === 'TRAINEE') {
        navigate('/welcome', { replace: true });
      } else {
        navigate('/hr/dashboard', { replace: true });
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || 'Failed to update password. Please try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: { xs: 2, sm: 3 },
        py: 4,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background ambient lighting */}
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: 500,
          height: 500,
          bgcolor: 'rgba(242, 101, 34, 0.12)',
          borderRadius: '50%',
          filter: 'blur(90px)',
          pointerEvents: 'none'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: 450,
          height: 450,
          bgcolor: 'rgba(0, 154, 222, 0.1)',
          borderRadius: '50%',
          filter: 'blur(90px)',
          pointerEvents: 'none'
        }}
      />

      {/* Centered Card */}
      <Card
        sx={{
          maxWidth: 440,
          width: '100%',
          p: { xs: 3.5, sm: 4.5 },
          borderRadius: 3,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.05)',
          position: 'relative',
          zIndex: 1,
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ mb: 3.5 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(242, 101, 34, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2.5,
              color: '#F26522'
            }}
          >
            <KeyOutlinedIcon sx={{ fontSize: 26 }} />
          </Box>
          <Typography variant="h4" color="text.primary" sx={{ fontWeight: 700, mb: 1 }}>
            Password Change Required
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            For your security, please update your temporary password to a new password before accessing your account.
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Current Password Field */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.75, ml: 0.5, fontWeight: 500 }}
              >
                Current Password
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
                      <LockOutlinedIcon color="action" sx={{ fontSize: 20 }} />
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
                          <VisibilityOutlinedIcon color="action" sx={{ fontSize: 20 }} />
                        ) : (
                          <VisibilityOffOutlinedIcon color="action" sx={{ fontSize: 20 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.2)' },
                    '&.Mui-focused fieldset': {
                      borderColor: '#F26522',
                      borderWidth: '1.5px'
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.15)'
                    }
                  }
                }}
              />
            </Box>

            {/* New Password Field */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.75, ml: 0.5, fontWeight: 500 }}
              >
                New Password
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
                      <LockOutlinedIcon color="action" sx={{ fontSize: 20 }} />
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
                          <VisibilityOutlinedIcon color="action" sx={{ fontSize: 20 }} />
                        ) : (
                          <VisibilityOffOutlinedIcon color="action" sx={{ fontSize: 20 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.2)' },
                    '&.Mui-focused fieldset': {
                      borderColor: '#F26522',
                      borderWidth: '1.5px'
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.15)'
                    }
                  }
                }}
              />
            </Box>

            {/* Confirm New Password Field */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.75, ml: 0.5, fontWeight: 500 }}
              >
                Confirm New Password
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
                      <LockOutlinedIcon color="action" sx={{ fontSize: 20 }} />
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
                          <VisibilityOutlinedIcon color="action" sx={{ fontSize: 20 }} />
                        ) : (
                          <VisibilityOffOutlinedIcon color="action" sx={{ fontSize: 20 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.2)' },
                    '&.Mui-focused fieldset': {
                      borderColor: '#F26522',
                      borderWidth: '1.5px'
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.15)'
                    }
                  }
                }}
              />
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                fontWeight: 700,
                mt: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                bgcolor: '#F26522',
                '&:hover': {
                  bgcolor: '#d9581b',
                  boxShadow: '0 6px 16px rgba(242, 101, 34, 0.3)'
                },
                boxShadow: '0 4px 12px rgba(242, 101, 34, 0.2)'
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Change Password'}
            </Button>

            {/* Logout link option */}
            <Box sx={{ textAlign: 'center', mt: 0.5 }}>
              <Button
                variant="text"
                size="small"
                onClick={logout}
                disabled={loading}
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': {
                    color: 'text.primary',
                    bgcolor: 'transparent',
                    textDecoration: 'underline'
                  }
                }}
              >
                Sign out and return to login
              </Button>
            </Box>
          </Box>
        </form>
      </Card>
    </Box>
  );
}
