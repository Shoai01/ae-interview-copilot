import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Divider, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLocation, useNavigate } from 'react-router-dom';
import { vivaService } from '../services/api';

export default function VivaComplete() {
  const location = useLocation();
  const navigate = useNavigate();
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
      
      <Card sx={{ width: '100%', maxWidth: 640, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: { xs: 5, md: 8 }, '&:last-child': { pb: { xs: 5, md: 8 } } }}>
          
          {/* Icon Area */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 5 }}>
            <Box sx={{ width: 104, height: 104, borderRadius: '50%', bgcolor: 'secondary.container', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            </Box>
          </Box>
          
          {/* Headlines */}
          <Typography variant="h2" sx={{ color: 'text.primary', mb: 2 }}>
            Your viva has been<br />submitted.
          </Typography>
          <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 400, fontFamily: 'DM Sans, sans-serif' }}>
            Your trainer will review the results.
          </Typography>

          {/* Divider */}
          <Divider sx={{ width: '85%', mx: 'auto', my: 5 }} />

          {/* Stats Row */}
          <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: { xs: 6, md: 12 }, width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                Duration
              </Typography>
              <Typography variant="h3" sx={{ color: 'text.primary', textAlign: 'center' }}>
                {summary ? formatDuration(summary.duration_seconds) : 'N/A'}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                Questions
              </Typography>
              <Typography variant="h3" sx={{ color: 'text.primary', textAlign: 'center' }}>
                {summary ? `${summary.questions_answered}/${summary.total_questions}` : 'N/A'}
              </Typography>
            </Box>
          </Box>
          
        </CardContent>
      </Card>
      
    </Box>
  );
}
