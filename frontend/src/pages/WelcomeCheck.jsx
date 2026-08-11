import React from 'react';
import { Box, Typography, Card, CardContent, Stack, Button, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import FormatListNumberedOutlinedIcon from '@mui/icons-material/FormatListNumberedOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import WifiOutlinedIcon from '@mui/icons-material/WifiOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SyncIcon from '@mui/icons-material/Sync';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export default function WelcomeCheck() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box component="header" sx={{ width: '100%', px: 4, py: 2, display: 'flex', alignItems: 'center', height: 64, position: 'sticky', top: 0, zIndex: 50, bgcolor: 'background.default' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', color: '#1a202c', fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>
          Viva Copilot<Typography component="span" variant="h6" color="primary.main" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>.</Typography>
        </Typography>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 4 }, width: '100%', maxWidth: 1440, mx: 'auto' }}>
        <Box sx={{ width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
          
          {/* Welcome Header */}
          <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Chip 
              label="DEVELOPER MODULE" 
              size="small"
              sx={{ 
                bgcolor: '#ffdbce', 
                color: '#a63b00', 
                fontWeight: 600, 
                fontSize: '11px',
                letterSpacing: '0.05em', 
                mb: 1.5,
                borderRadius: '16px',
                px: 1
              }} 
            />
            <Typography variant="h2" sx={{ fontWeight: 700, fontSize: { xs: '32px', md: '48px' }, mb: 1, color: '#0d1c2e' }}>
              Welcome, Rahul
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '18px' }}>
              Let's get you ready for your AI-powered evaluation.
            </Typography>
          </Box>

          {/* Cards Container */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, width: '100%' }}>
            
            {/* Instructions Card */}
            <Card sx={{ flex: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0px 4px 20px rgba(0,0,0,0.02)', p: 1 }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pb: 2, mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <InfoOutlinedIcon sx={{ color: '#f26522' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>Viva Details</Typography>
                </Stack>
                
                <Stack spacing={4}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <TimerOutlinedIcon sx={{ color: '#009ade', fontSize: '22px' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0d1c2e', mb: 0.5 }}>Duration</Typography>
                      <Typography variant="body2" sx={{ color: '#535f74', lineHeight: 1.6 }}>Approximately 25-30 minutes. Ensure you have uninterrupted time.</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <FormatListNumberedOutlinedIcon sx={{ color: '#009ade', fontSize: '22px' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0d1c2e', mb: 0.5 }}>Questions</Typography>
                      <Typography variant="body2" sx={{ color: '#535f74', lineHeight: 1.6 }}>15 dynamic questions tailored to your Developer profile.</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <SmartToyOutlinedIcon sx={{ color: '#009ade', fontSize: '22px' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0d1c2e', mb: 0.5 }}>AI Evaluation</Typography>
                      <Typography variant="body2" sx={{ color: '#535f74', lineHeight: 1.6 }}>Responses are analyzed in real-time for technical accuracy and clarity.</Typography>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* System Check Card */}
            <Card sx={{ flex: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0px 4px 20px rgba(0,0,0,0.02)', p: 1 }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2, mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <FactCheckOutlinedIcon sx={{ color: '#f26522' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>System Check</Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: '#535f74', fontWeight: 500 }}>4/5 Ready</Typography>
                </Box>
                
                <Stack spacing={1}>
                  {/* Camera */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <VideocamOutlinedIcon sx={{ color: '#535f74', fontSize: '20px' }} />
                      <Typography variant="body2" sx={{ color: '#0d1c2e' }}>Camera</Typography>
                    </Stack>
                    <CheckCircleIcon sx={{ color: '#16a34a', fontSize: '20px' }} />
                  </Box>
                  
                  {/* Microphone */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <MicNoneOutlinedIcon sx={{ color: '#535f74', fontSize: '20px' }} />
                      <Typography variant="body2" sx={{ color: '#0d1c2e' }}>Microphone</Typography>
                    </Stack>
                    <CheckCircleIcon sx={{ color: '#16a34a', fontSize: '20px' }} />
                  </Box>
                  
                  {/* Speaker */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: '#fffbeb', border: '1px solid #fef3c7' }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <VolumeUpOutlinedIcon sx={{ color: '#f59e0b', fontSize: '20px' }} />
                      <Typography variant="body2" sx={{ color: '#0d1c2e' }}>Speaker</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: '#f59e0b' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Checking</Typography>
                      <SyncIcon sx={{ fontSize: '16px', animation: 'spin 2s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                    </Stack>
                  </Box>
                  
                  {/* Internet */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <WifiOutlinedIcon sx={{ color: '#535f74', fontSize: '20px' }} />
                      <Typography variant="body2" sx={{ color: '#0d1c2e' }}>Internet</Typography>
                    </Stack>
                    <CheckCircleIcon sx={{ color: '#16a34a', fontSize: '20px' }} />
                  </Box>
                  
                  {/* Browser */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <PublicOutlinedIcon sx={{ color: '#535f74', fontSize: '20px' }} />
                      <Typography variant="body2" sx={{ color: '#0d1c2e' }}>Browser</Typography>
                    </Stack>
                    <CheckCircleIcon sx={{ color: '#16a34a', fontSize: '20px' }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

          </Box>

          {/* CTA */}
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2, gap: 1.5 }}>
            <Button 
              variant="contained" 
              sx={{ 
                bgcolor: '#F26522', 
                color: '#fff',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '16px',
                px: 4, 
                py: 1.5, 
                borderRadius: 2,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#d95a1e', boxShadow: 'none' }
              }}
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/interview')}
            >
              I Accept & Start Viva
            </Button>
            <Typography variant="body2" sx={{ color: '#8d7166', fontSize: '13px' }}>
              Button will enable once system check is complete.
            </Typography>
          </Box>

        </Box>
      </Box>
    </Box>
  );
}
