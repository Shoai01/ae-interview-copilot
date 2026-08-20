import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Alert
} from '@mui/material';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
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
    React.useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === 'TRAINEE') {
                navigate('/welcome');
            } else {
                navigate('/hr/dashboard');
            }
        }
    }, [isAuthenticated, user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await login(username, password);
            const from = location.state?.from?.pathname;
            
            if (from && from !== '/') {
                navigate(from, { replace: true });
            } else if (data.role === 'TRAINEE') {
                navigate('/welcome');
            } else {
                navigate('/hr/dashboard');
            }
        } catch (err) {
            if (err.response?.status === 429) {
                setError("Too many login attempts. Please try again in a minute.");
            } else {
                setError(err.response?.data?.detail || 'Invalid username or password');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflowY: 'auto', flexDirection: { xs: 'column', lg: 'row' }, bgcolor: 'background.default' }}>
            
            {/* Left Side (Info Panel) */}
            <Box sx={{ 
                width: { xs: '100%', lg: '50%' }, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center',
                px: { xs: 4, sm: 8, lg: 12 },
                py: { xs: 8, lg: 10 },
                background: 'linear-gradient(to bottom right, #FFDBCE, #D7E3FC)',
                position: 'relative',
                borderRight: '1px solid rgba(0,0,0,0.05)',
                overflow: 'hidden'
            }}>
                <Box sx={{ position: 'absolute', top: '-10%', right: '-10%', width: 500, height: 500, bgcolor: 'rgba(242, 101, 34, 0.2)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
                <Box sx={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 400, height: 400, bgcolor: 'rgba(0, 154, 222, 0.15)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
                <Box sx={{ maxWidth: 500, position: 'relative', zIndex: 1 }}>
                    <Typography variant="h2" color="text.primary" sx={{ fontWeight: 700, mb: 3, lineHeight: 1.2 }}>
                        AI-powered interviews, <Box component="span" color="primary.main">evaluated in real time</Box>
                    </Typography>

                    <Typography variant="body1" color="text.secondary" sx={{ mb: 5, fontSize: '1.1rem', lineHeight: 1.6 }}>
                        Empower your recruitment with precision AI that analyzes technical depth, communication skills, and candidate confidence in every spoken response.
                    </Typography>
                </Box>

                <Box sx={{ position: 'absolute', bottom: 40, left: { xs: 32, sm: 64, lg: 96 }, width: 'calc(100% - 192px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
                        © 2026 AutomationEdge Technologies. All rights reserved.
                    </Typography>
                </Box>
            </Box>

            {/* Right Side (Form Panel) */}
            <Box sx={{ 
                width: { xs: '100%', lg: '50%' }, 
                display: 'flex', 
                alignItems: 'flex-start', 
                justifyContent: 'center',
                position: 'relative',
                py: { xs: 8, lg: 0 },
                px: { xs: 4, sm: 8 },
                bgcolor: 'background.default'
            }}>
                <Box sx={{ 
                    my: 'auto',
                    maxWidth: 420, 
                    width: '100%', 
                    bgcolor: 'background.paper',
                    p: { xs: 4, sm: 5 }, 
                    borderRadius: 3, 
                    border: '1px solid rgba(255,255,255,0.6)',
                    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.05)',
                    position: 'relative',
                    zIndex: 1
                }}>
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h4" color="text.primary" sx={{ fontWeight: 700, mb: 1 }}>
                            Welcome back 👋
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleLogin}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, ml: 0.5, fontWeight: 500 }}>
                                    Username or Email
                                </Typography>
                                <TextField 
                                    fullWidth
                                    placeholder="admin / you@company.com"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    variant="outlined"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <MailOutlinedIcon color="action" sx={{ fontSize: 20 }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: 'white',
                                            borderRadius: 2,
                                            transition: 'all 0.2s ease',
                                            '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
                                            '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.2)' },
                                            '&.Mui-focused fieldset': { 
                                                borderColor: 'primary.main',
                                                borderWidth: '1px',
                                            },
                                            '&.Mui-focused': {
                                                boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.15)',
                                            }
                                        }
                                    }}
                                />
                            </Box>

                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                        Password
                                    </Typography>
                                </Box>
                                <TextField 
                                    fullWidth
                                    placeholder="••••••••"
                                    required
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlinedIcon color="action" sx={{ fontSize: 20 }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton edge="end" size="small" onClick={() => setShowPassword(!showPassword)}>
                                                    {showPassword ? <VisibilityOutlinedIcon color="action" sx={{ fontSize: 20 }} /> : <VisibilityOffOutlinedIcon color="action" sx={{ fontSize: 20 }} />}
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
                                                borderColor: 'primary.main',
                                                borderWidth: '1px',
                                            },
                                            '&.Mui-focused': {
                                                boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.15)',
                                            }
                                        }
                                    }}
                                />
                            </Box>

                            <Button 
                                type="submit" 
                                variant="contained" 
                                color="primary" 
                                fullWidth 
                                size="large"
                                disabled={loading}
                                sx={{ 
                                    py: 1.5, 
                                    fontWeight: 700, 
                                    mt: 2, 
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    boxShadow: '0 4px 12px rgba(242, 101, 34, 0.2)',
                                    '&:hover': {
                                        boxShadow: '0 6px 16px rgba(242, 101, 34, 0.3)',
                                    }
                                }}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </Box>
                    </form>
                </Box>
            </Box>
        </Box>
    );
}
