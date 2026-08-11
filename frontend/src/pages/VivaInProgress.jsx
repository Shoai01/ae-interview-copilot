import React from 'react';
import { Box, Typography, IconButton, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CodeIcon from '@mui/icons-material/Code';
import TimerIcon from '@mui/icons-material/Timer';
import MicIcon from '@mui/icons-material/Mic';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PersonIcon from '@mui/icons-material/Person';

export default function VivaInProgress() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Glows */}
      <Box sx={{ position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%', bgcolor: '#dce9ff', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.5, zIndex: 0 }} />
      <Box sx={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '40%', height: '40%', bgcolor: '#d5e3fc', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.4, zIndex: 0 }} />

      {/* Top Bar */}
      <Box component="header" sx={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 40, px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
        
        {/* Info Pill */}
        <Paper elevation={0} sx={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 2, pointerEvents: 'auto', backdropFilter: 'blur(12px)', bgcolor: 'rgba(255,255,255,0.9)' }}>
          <Box sx={{ bgcolor: 'rgba(0,0,0,0.04)', px: 1.5, py: 0.5, borderRadius: 4, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CodeIcon fontSize="small" />
            <Typography variant="overline" sx={{ letterSpacing: 0, fontSize: '14px', textTransform: 'none' }}>Developer</Typography>
          </Box>
          <Typography variant="body2" sx={{ borderLeft: '1px solid rgba(0,0,0,0.1)', pl: 2 }}>Question 4 of 10</Typography>
          <Typography variant="h4" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, borderLeft: '1px solid rgba(0,0,0,0.1)', pl: 2 }}>
            <TimerIcon />
            08:45
          </Typography>
        </Paper>

        {/* Camera Preview */}
        <Box sx={{ 
          width: 200, 
          height: 200, 
          borderRadius: 4, 
          border: '2px solid rgba(0,0,0,0.08)', 
          overflow: 'hidden', 
          boxShadow: 3, 
          pointerEvents: 'auto', 
          position: 'relative', 
          bgcolor: '#eaf1ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <PersonIcon sx={{ fontSize: 100, color: '#aab9d2' }} />
          <Box sx={{ position: 'absolute', bottom: 12, right: 12, width: 14, height: 14, bgcolor: '#10b981', borderRadius: '50%', border: '2px solid white', boxShadow: 1 }} />
        </Box>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3, pt: 12, pb: 6, maxWidth: 1440, mx: 'auto', width: '100%', zIndex: 10 }}>
        
        {/* Question Area */}
        <Box sx={{ maxWidth: 800, textAlign: 'center', mb: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <VolumeUpIcon sx={{ color: 'text.secondary', fontSize: 32, opacity: 0.7 }} />
          </Box>
          <Typography variant="h1" sx={{ letterSpacing: '-0.02em', mb: 4 }}>
            Explain the difference between abstract classes and interfaces in Java.
          </Typography>

          {/* Minimal Waveform */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: 32, opacity: 0.8 }}>
            {[0, 0.1, 0.2, 0.3, 0.4].map((delay, i) => (
              <Box key={i} sx={{ 
                width: 4, 
                height: 8, 
                bgcolor: 'primary.main', 
                borderRadius: 4, 
                animation: 'pulse-wave 1.2s infinite ease-in-out alternate', 
                animationDelay: `${delay}s`,
                '@keyframes pulse-wave': {
                  '0%': { height: '8px' },
                  '100%': { height: '24px' }
                }
              }} />
            ))}
          </Box>
        </Box>

        {/* Interactive Controls & Transcript */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 600 }}>
          
          {/* Record Button */}
          <IconButton 
            color="primary" 
            sx={{ 
              width: 96, 
              height: 96, 
              bgcolor: 'primary.light', 
              color: 'primary.dark',
              boxShadow: 2,
              mb: 4,
              '&:hover': { bgcolor: 'primary.main', color: 'white' },
              animation: 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
              '@keyframes pulse-ring': {
                '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(242, 101, 34, 0.7)' },
                '70%': { transform: 'scale(1)', boxShadow: '0 0 0 20px rgba(242, 101, 34, 0)' },
                '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(242, 101, 34, 0)' }
              }
            }}
          >
            <MicIcon sx={{ fontSize: 40 }} />
          </IconButton>

          {/* Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500, fontSize: '12px', mb: 2 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            Listening...
          </Box>

          {/* Live Transcript */}
          <Paper elevation={0} sx={{ 
            width: '100%', 
            minHeight: 120, 
            p: 3, 
            borderRadius: 3, 
            border: '1px solid rgba(0,0,0,0.08)', 
            bgcolor: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 32, background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />
            <Typography variant="body1" sx={{ fontSize: '18px', color: '#594138', lineHeight: 1.8 }}>
              In Java, an abstract class allows you to create functionality that subclasses can implement or override. An interface only allows you to define functionality, not implement it.
              <Box component="span" sx={{ borderRight: '2px solid', borderColor: 'primary.main', display: 'inline-block', height: 20, ml: 0.5, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', verticalAlign: 'middle' }} />
            </Typography>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 32, background: 'linear-gradient(0deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />
          </Paper>

          {/* Submit Answer */}
          <Box sx={{ mt: 4, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              sx={{ px: 4, py: 1.5, fontSize: '16px', fontWeight: 600, borderRadius: 2, boxShadow: 'none' }}
              onClick={() => navigate('/complete')}
            >
              Submit Answer
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
