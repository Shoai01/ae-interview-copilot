import { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Avatar, Stack, CircularProgress, Grid } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import SendIcon from '@mui/icons-material/Send';
import { vivaService } from '@/services/api';

export default function TrainerReviewDetail() {
  const navigate = useNavigate();
  const { id: sessionId } = useParams();
  
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await vivaService.getSessionReport(sessionId);
        setReportData(data);
      } catch (err) {
        console.error("Failed to fetch session report:", err);
        setError("Could not load report details.");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [sessionId]);

  if (loading) {
    return (
      <Layout>
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error || !reportData) {
    return (
      <Layout>
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="error">{error || "Report not found"}</Typography>
        </Box>
      </Layout>
    );
  }

  const { trainee, summary, report, questions } = reportData;
  const candidateName = trainee?.name || 'Unknown Candidate';
  const avatarLetter = candidateName.charAt(0);
  
  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '0m 0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <Layout>
      <Box sx={{ pb: 28 }}>
        {/* Back Navigation */}
        <Box 
          onClick={() => navigate('/hr/sessions')}
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: 'text.secondary', cursor: 'pointer', mb: 2, '&:hover': { color: 'text.primary' } }}
        >
          <ArrowBackIcon fontSize="small" />
          <Typography variant="body2" fontWeight={500}>Back to Sessions</Typography>
        </Box>

        {/* Header Card: Trainee Info */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.08)', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 64, height: 64, background: 'linear-gradient(135deg, rgba(242, 101, 34, 0.15) 0%, rgba(0, 154, 222, 0.15) 100%)', color: 'primary.main', fontWeight: 700, fontSize: 24 }}>
              {avatarLetter}
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>{candidateName}</Typography>
              <Typography variant="body2" color="text.secondary">Emp ID: {trainee?.employee_id || 'N/A'}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>Date</Typography>
              <Typography variant="body2" fontWeight={500}>
                {new Date(reportData.session.start_time).toLocaleDateString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>Duration</Typography>
              <Typography variant="body2" fontWeight={500}>{formatDuration(summary.duration_seconds)}</Typography>
            </Box>
          </Box>
        </Paper>

        {/* AI Summary Card */}
        {report ? (
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'rgba(0, 154, 222, 0.2)', background: 'linear-gradient(135deg, rgba(0,154,222,0.03) 0%, rgba(242,101,34,0.03) 100%)' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <PsychologyIcon color="primary" sx={{ mt: 0.5 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif', mb: 0.5 }}>AI Summary</Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>Strengths:</Typography>
                  <Typography variant="body2" color="text.secondary">{report.strengths || "N/A"}</Typography>
                  
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>Areas of Improvement:</Typography>
                  <Typography variant="body2" color="text.secondary">{report.areas_of_improvement || "N/A"}</Typography>
                </Box>

                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.04)', px: 1.5, py: 0.5, borderRadius: 4 }}>
                  {report.ai_recommendation === 'PASS' && <CheckCircleIcon sx={{ fontSize: 16, color: '#059669' }} />}
                  {report.ai_recommendation === 'BORDERLINE' && <WarningIcon sx={{ fontSize: 16, color: '#d97706' }} />}
                  {report.ai_recommendation === 'FAIL' && <CancelIcon sx={{ fontSize: 16, color: '#dc2626' }} />}
                  <Typography variant="caption" fontWeight={600}>Recommended: {report.ai_recommendation}</Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        ) : (
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.02)' }}>
            <Typography variant="body2" color="text.secondary">AI Evaluation is pending or failed to generate.</Typography>
          </Paper>
        )}

        {/* Main Layout: Full width sections */}
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif', borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>
              Transcript & Assessment
            </Typography>

            {questions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No questions were recorded for this session.</Typography>
            ) : (
              questions.map((q, index) => (
                <Paper key={q.viva_question_id} elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{index + 1}. {q.text}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDuration(q.duration)}</Typography>
                  </Box>
                  <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', mb: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                      "{q.transcript || "(No transcript available)"}"
                    </Typography>
                    {q.evaluation?.ai_feedback && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(0, 154, 222, 0.04)', borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'secondary.main' }}>
                        <Typography variant="caption" sx={{ color: 'secondary.dark', fontWeight: 600 }}>
                          AI Feedback: {q.evaluation.ai_feedback}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  {q.evaluation ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      <ScoreBar label="Communication" score={q.evaluation.score_communication || 0} percentage={(q.evaluation.score_communication || 0) * 10} color="#009ADE" />
                      <ScoreBar label="Technical" score={q.evaluation.score_technical || 0} percentage={(q.evaluation.score_technical || 0) * 10} color="#F26522" />
                      <ScoreBar label="Confidence" score={q.evaluation.score_confidence || 0} percentage={(q.evaluation.score_confidence || 0) * 10} color="#009ADE" />
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">No evaluation scores available.</Typography>
                  )}
                </Paper>
              ))
            )}
          </Grid>

          {/* Decision Panel */}
          <Grid item xs={12}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif', borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>
                Final Decision
              </Typography>
              <Paper elevation={0} sx={{ 
                p: { xs: 2, md: 3 },
                borderRadius: 3,
                border: '1px solid', 
                borderColor: 'rgba(0,0,0,0.08)',
                bgcolor: '#fff'
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>Trainer Notes</Typography>
                    <Box 
                      component="textarea" 
                      placeholder="Add final remarks..." 
                      rows={4} 
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
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 1 }}>
                    <Button variant="outlined" color="secondary" sx={{ flex: 1, borderRadius: 2, fontWeight: 600, py: 1 }}>Hold</Button>
                    <Button variant="outlined" color="error" sx={{ flex: 1, borderRadius: 2, fontWeight: 600, py: 1 }}>Fail</Button>
                    <Button variant="outlined" color="success" sx={{ flex: 1, borderRadius: 2, fontWeight: 600, py: 1 }}>Pass</Button>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      endIcon={<SendIcon />}
                      sx={{ flex: 2, boxShadow: '0 4px 14px rgba(242, 101, 34, 0.4)', borderRadius: 2, px: 3, py: 1.5, fontWeight: 600, '&:hover': { boxShadow: '0 6px 20px rgba(242, 101, 34, 0.6)' } }}
                      onClick={() => navigate('/hr/sessions')}
                    >
                      Submit Decision
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}

function ScoreBar({ label, score, percentage, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 100, fontWeight: 500, flexShrink: 0 }}>{label}</Typography>
      <Box sx={{ width: 96, height: 8, bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ width: `${Math.min(100, Math.max(0, percentage))}%`, height: '100%', bgcolor: color, borderRadius: 4 }} />
      </Box>
      <Typography variant="caption" fontWeight={600}>{Number(score).toFixed(1)}/10</Typography>
    </Box>
  );
}
