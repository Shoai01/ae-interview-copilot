import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Checkbox, 
  FormControlLabel, 
  InputAdornment, 
  IconButton, 
  Divider, 
  Link,
  Paper
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import { useNavigate } from 'react-router-dom';

export default function TrainerLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // For now, redirect to dashboard
    navigate('/hr/dashboard');
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: 'background.default',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* TopAppBar */}
      <Box 
        component="header" 
        sx={{ 
          position: 'fixed', 
          top: 0, 
          width: '100%', 
          zIndex: 50, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          height: 64, 
          px: 3, 
          maxWidth: 1440, 
          mx: 'auto' 
        }}
      >
        <Typography 
          variant="h3" 
          sx={{ display: 'flex', alignItems: 'baseline', color: 'text.primary' }}
        >
          Viva Copilot<Box component="span" sx={{ color: 'primary.main', fontSize: '2.5rem', lineHeight: 0 }}>.</Box>
        </Typography>
      </Box>

      {/* Decorative Background */}
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <Box 
          sx={{ 
            position: 'absolute', 
            top: '-25%', 
            right: '-25%', 
            width: 800, 
            height: 800, 
            bgcolor: 'primary.main', 
            borderRadius: '50%', 
            filter: 'blur(100px)', 
            opacity: 0.05, 
            mixBlendMode: 'multiply' 
          }} 
        />
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: '-25%', 
            left: '-25%', 
            width: 600, 
            height: 600, 
            bgcolor: 'secondary.main', 
            borderRadius: '50%', 
            filter: 'blur(100px)', 
            opacity: 0.05, 
            mixBlendMode: 'multiply' 
          }} 
        />
      </Box>

      {/* Main Content Area */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          pt: 12, 
          pb: 12, 
          px: { xs: 2, sm: 3 },
          position: 'relative',
          zIndex: 10
        }}
      >
        <Paper 
          elevation={0} 
          sx={{ 
            width: '100%', 
            maxWidth: 448, // 28rem max-w-md
            p: { xs: 4, sm: 6 }, 
            borderRadius: 3, 
            border: '1px solid', 
            borderColor: 'divider',
            transition: 'box-shadow 0.3s',
            '&:hover': {
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
            }
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h2" sx={{ mb: 1, color: 'text.primary' }}>
              Sign in
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome back to Viva Copilot
            </Typography>
          </Box>

          <form onSubmit={handleLogin}>
            {/* Email Field */}
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="overline" 
                component="label" 
                htmlFor="email"
                sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
              >
                Email Address
              </Typography>
              <TextField
                fullWidth
                id="email"
                type="email"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Password Field */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography 
                  variant="overline" 
                  component="label" 
                  htmlFor="password"
                  sx={{ color: 'text.secondary' }}
                >
                  Password
                </Typography>
                <Link 
                  href="#" 
                  variant="overline" 
                  underline="none" 
                  sx={{ color: 'secondary.main', '&:hover': { color: 'primary.main' } }}
                >
                  Forgot password?
                </Link>
              </Box>
              <TextField
                fullWidth
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: 'text.secondary' }}
                      >
                        {showPassword ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            {/* Remember Me */}
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={<Checkbox id="remember-me" color="primary" sx={{ color: 'text.secondary' }} />}
                label={<Typography variant="body2" color="text.secondary">Remember me for 30 days</Typography>}
              />
            </Box>

            {/* Primary Action */}
            <Button 
              fullWidth 
              variant="contained" 
              color="primary" 
              type="submit"
              sx={{ 
                py: 1.5,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 'bold',
                mb: 4
              }}
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <Box sx={{ position: 'relative', mb: 3 }}>
            <Divider sx={{ borderColor: 'divider' }} />
            <Box 
              sx={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                bgcolor: 'background.paper', 
                px: 2 
              }}
            >
              <Typography variant="body2" color="text.secondary">
                or continue with
              </Typography>
            </Box>
          </Box>

          {/* SSO Option */}
          <Button 
            fullWidth 
            variant="outlined" 
            color="inherit" 
            startIcon={<VpnKeyOutlinedIcon />}
            sx={{ 
              py: 1.5,
              borderColor: 'divider',
              color: 'text.primary',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 500,
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.02)',
                borderColor: 'divider'
              }
            }}
          >
            Single Sign-On (SSO)
          </Button>
          
          {/* Contextual Image Placeholder */}
          <Box 
            sx={{ 
              mt: 4, 
              display: { xs: 'none', lg: 'block' },
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              opacity: 0.8,
              transition: 'opacity 0.3s, filter 0.3s',
              filter: 'grayscale(50%)',
              '&:hover': {
                opacity: 1,
                filter: 'grayscale(0%)'
              }
            }}
          >
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcf7jA6bwxsWezqlu-TznleIns3jgT3LN6Uw8Z00vaRodWJTckVrBt7GdpugosNBec_pRETNr5xBzBVrdgH2ZV6PU7eQ7kUgIT15hz3Th7YhonQ6rhBey1mdjSLMuAKPjsVqD1fPp4VwpvjAqzGEv5wjIN-JS-jjjtTKl7hcZ1Mnrc5nlANVyONliMrx2KC2h47hn1EucS__t8P8I2WneAzmvkkr2Dge6c94yuKAXatRNtsCTHRIgo" 
              alt="Contextual graphic"
              style={{ width: '100%', height: '96px', objectFit: 'cover', display: 'block' }}
            />
          </Box>
        </Paper>
      </Box>

      {/* Footer */}
      <Box 
        component="footer" 
        sx={{ 
          position: 'fixed', 
          bottom: 0, 
          width: '100%', 
          zIndex: 40,
          px: 3, 
          py: 2
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            justifyContent: 'space-between', 
            alignItems: 'center',
            maxWidth: 1440,
            mx: 'auto'
          }}
        >
          <Typography variant="overline" sx={{ color: 'text.primary', opacity: 0.7, mb: { xs: 2, md: 0 } }}>
            © 2024 Viva Copilot. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['Privacy Policy', 'Terms of Service', 'Contact Support'].map((text) => (
              <Link 
                key={text} 
                href="#" 
                variant="overline" 
                underline="none" 
                sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
              >
                {text}
              </Link>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
