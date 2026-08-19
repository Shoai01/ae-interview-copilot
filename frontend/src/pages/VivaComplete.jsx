import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Divider, CircularProgress, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLocation, useNavigate } from 'react-router-dom';
import { vivaService } from '@/services/api';
import { useAuth } from '@/store/AuthContext';

export default function VivaComplete() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const sessionId = location.state?.sessionId;
  
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
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
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      
      <Card sx={{ 
        width: '100%', 
        maxWidth: 640, 
        borderRadius: 4, 
        border: '1px solid rgba(0,0,0,0.08)', 
        boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
        animation: 'slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        '@keyframes slideUpFade': {
          '0%': { opacity: 0, transform: 'translateY(40px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: { xs: 3, md: 6 }, '&:last-child': { pb: { xs: 3, md: 6 } } }}>
          
          {/* Icon Area */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <Box sx={{ 
              width: 120, height: 120, borderRadius: '50%', 
              bgcolor: 'rgba(242, 101, 34, 0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              animation: 'pulseGlow 2s infinite',
              '@keyframes pulseGlow': {
                '0%': { boxShadow: '0 0 0 0 rgba(242, 101, 34, 0.4)' },
                '70%': { boxShadow: '0 0 0 20px rgba(242, 101, 34, 0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(242, 101, 34, 0)' }
              }
            }}>
              <CheckCircleIcon sx={{ fontSize: 56, color: 'primary.main' }} />
            </Box>
          </Box>
          
          {/* Headlines */}
          <Typography variant="h2" sx={{ color: 'text.primary', mb: 2, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'Syne, sans-serif' }}>
            Your viva has been<br />submitted.
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 400 }}>
            Your trainer will review the results shortly.
          </Typography>

          {/* Divider */}
          <Divider sx={{ width: '85%', mx: 'auto', my: 5 }} />

          {/* Stats Row */}
          <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: { xs: 2, md: 6 }, width: '100%', mb: 6 }}>
            <Box sx={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)',
              borderRadius: 3, p: { xs: 2, sm: 3 }, minWidth: { xs: 120, sm: 160 }
            }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, letterSpacing: '0.05em' }}>
                Duration
              </Typography>
              <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 600 }}>
                {summary ? formatDuration(summary.duration_seconds) : 'N/A'}
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)',
              borderRadius: 3, p: { xs: 2, sm: 3 }, minWidth: { xs: 120, sm: 160 }
            }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, letterSpacing: '0.05em' }}>
                Questions
              </Typography>
              <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 600 }}>
                {summary ? `${summary.questions_answered}/${summary.total_questions}` : 'N/A'}
              </Typography>
            </Box>
          </Box>
          
          <Button 
            variant="outlined" 
            color="inherit" 
            onClick={handleLogout}
            sx={{ 
              borderRadius: 2, px: 4, py: 1.5, fontWeight: 600, color: 'text.secondary',
              borderColor: 'rgba(0,0,0,0.12)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', borderColor: 'rgba(0,0,0,0.24)' }
            }}
          >
            Sign Out & Return Home
          </Button>
        </CardContent>
      </Card>
      
    </Box>
  );
}
