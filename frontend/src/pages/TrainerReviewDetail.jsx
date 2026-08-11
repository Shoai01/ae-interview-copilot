import React from 'react';
import { Box, Typography, Button, IconButton, Paper, Avatar, Stack } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import SendIcon from '@mui/icons-material/Send';

export default function TrainerReviewDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock data for the candidate
  const candidateName = id === 'EMP-7104' ? 'Jerome Bell' : id === 'EMP-8832' ? 'Cameron Williamson' : 'Eleanor Pena';
  const avatarLetter = candidateName.charAt(0);

  return (
    <Layout>
      <Box sx={{ pb: 12 }}>
        {/* Back Navigation */}
        <Box 
          onClick={() => navigate('/hr/dashboard')}
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: 'text.secondary', cursor: 'pointer', mb: 2, '&:hover': { color: 'text.primary' } }}
        >
          <ArrowBackIcon fontSize="small" />
          <Typography variant="body2" fontWeight={500}>Back to Sessions</Typography>
        </Box>

        {/* Header Card: Trainee Info */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(242, 101, 34, 0.08)', color: 'primary.main', fontWeight: 600, fontSize: 24 }}>
              {avatarLetter}
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>{candidateName}</Typography>
              <Typography variant="body2" color="text.secondary">Dev Module Assessment</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>Date</Typography>
              <Typography variant="body2" fontWeight={500}>Oct 24, 2023</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>Duration</Typography>
              <Typography variant="body2" fontWeight={500}>45m 12s</Typography>
            </Box>
          </Box>
        </Paper>

        {/* AI Summary Card */}
        <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid', borderLeftColor: 'primary.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <PsychologyIcon color="primary" sx={{ mt: 0.5 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif', mb: 0.5 }}>AI Summary</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Candidate shows strong technical depth but occasionally pauses during complex architectural explanations. Demonstrates solid understanding of modern framework lifecycles.
              </Typography>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.04)', px: 1.5, py: 0.5, borderRadius: 4 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: '#059669' }} />
                <Typography variant="caption" fontWeight={600}>Recommended: Pass</Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Transcript Section */}
        <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif', borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>
          Transcript & Assessment
        </Typography>

        {/* Question 1 */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>1. Explain the difference between state and props in React.</Typography>
            <Typography variant="caption" color="text.secondary">02:15</Typography>
          </Box>
          <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Typography variant="body2">
              "So, props are passed down from a parent component... and they are immutable. State is managed within the component itself and can be updated using the setter function from useState."
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <ScoreBar label="Communication" score={8.5} percentage={85} color="#006492" />
            <ScoreBar label="Technical" score={9.0} percentage={90} color="#a63b00" />
            <ScoreBar label="Confidence" score={7.5} percentage={75} color="#006492" />
          </Box>
        </Paper>

        {/* Question 2 */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>2. How would you handle a memory leak caused by event listeners?</Typography>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: '#ffdad6', color: '#93000a', px: 1, py: 0.25, borderRadius: 4, mt: 1 }}>
                <WarningIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption" fontWeight={600}>Multiple faces detected (05:12)</Typography>
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">04:30</Typography>
          </Box>
          <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Typography variant="body2">
              "Uh, well... you should probably remove them when the component unmounts. Like, returning a cleanup function in useEffect. <span style={{ borderBottom: '1px solid rgba(166,59,0,0.5)', color: '#535f74' }}>Yes, that's correct...</span>"
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <ScoreBar label="Communication" score={6.0} percentage={60} color="#006492" />
            <ScoreBar label="Technical" score={7.0} percentage={70} color="#a63b00" />
            <ScoreBar label="Confidence" score={4.0} percentage={40} color="#006492" />
          </Box>
        </Paper>

      </Box>

      {/* Fixed Decision Panel */}
      <Box sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: { xs: 0, lg: 280 }, 
        right: 0, 
        bgcolor: 'background.paper', 
        borderTop: '1px solid', 
        borderColor: 'divider', 
        p: { xs: 2, md: 3 },
        boxShadow: '0px -4px 20px rgba(0,0,0,0.05)',
        zIndex: 20
      }}>
        <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>Trainer Notes</Typography>
            <Box 
              component="textarea" 
              placeholder="Add final remarks..." 
              rows={2} 
              sx={{ 
                width: '100%', 
                p: 1.5, 
                borderRadius: 2, 
                border: '1px solid', 
                borderColor: 'divider', 
                fontFamily: 'inherit',
                fontSize: 14,
                resize: 'none',
                '&:focus': { outline: 'none', borderColor: 'primary.main' } 
              }} 
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
            <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <Button variant="outlined" color="secondary" sx={{ flex: 1 }}>Hold</Button>
              <Button variant="outlined" color="error" sx={{ flex: 1 }}>Fail</Button>
              <Button variant="outlined" color="success" sx={{ flex: 1 }}>Pass</Button>
            </Stack>
            <Button 
              variant="contained" 
              color="primary" 
              endIcon={<SendIcon />}
              sx={{ boxShadow: 'none' }}
              onClick={() => navigate('/hr/dashboard')}
            >
              Submit Decision
            </Button>
          </Box>
        </Box>
      </Box>
    </Layout>
  );
}

function ScoreBar({ label, score, percentage, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ width: 80, fontWeight: 500 }}>{label}</Typography>
      <Box sx={{ width: 96, height: 8, bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ width: `${percentage}%`, height: '100%', bgcolor: color, borderRadius: 4 }} />
      </Box>
      <Typography variant="caption" fontWeight={600}>{score.toFixed(1)}</Typography>
    </Box>
  );
}
