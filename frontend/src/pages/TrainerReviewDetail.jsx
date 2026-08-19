import { useEffect, useState } from 'react';
import { Box, Typography, Button, Avatar, Stack, CircularProgress, Grid, Card, Chip, TextField } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import SendIcon from '@mui/icons-material/Send';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BadgeIcon from '@mui/icons-material/Badge';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { vivaService } from '@/services/api';

export default function TrainerReviewDetail() {
  const navigate = useNavigate();
  const { id: sessionId } = useParams();
  
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [trainerNotes, setTrainerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const getRecChipProps = (rec) => {
    if (rec === 'PASS') return { icon: <CheckCircleIcon sx={{ fontSize: 14 }} />, color: 'success', label: 'Pass' };
    if (rec === 'FAIL') return { icon: <CancelIcon sx={{ fontSize: 14 }} />, color: 'error', label: 'Fail' };
    return { icon: <WarningIcon sx={{ fontSize: 14 }} />, color: 'warning', label: 'Borderline' };
  };

  const decisionButtons = [
    { key: 'HOLD', label: 'Hold', color: '#475569', bg: 'rgba(71,85,105,0.08)', border: 'rgba(71,85,105,0.25)' },
    { key: 'FAIL', label: 'Fail', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
    { key: 'PASS', label: 'Pass', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
  ];

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 28 }}>

        {/* Back Navigation */}
        <Box onClick={() => navigate('/hr/sessions')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/hr/sessions')} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'primary.main' }, transition: 'color 0.2s' }}
        >
          <ArrowBackIcon sx={{ fontSize: 18 }} />
          <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'DM Sans, sans-serif' }}>Back to Sessions</Typography>
        </Box>

        {/* ─── Top Section: Candidate Info + Stats ─── */}
        <Card sx={{ p: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', p: { xs: 2.5, md: 3 }, gap: 2 }}>
            {/* Candidate */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{
                width: 52, height: 52,
                background: 'linear-gradient(135deg, rgba(242,101,34,0.15) 0%, rgba(242,101,34,0.05) 100%)',
                color: 'primary.main', fontWeight: 700, fontSize: 20, fontFamily: 'Syne, sans-serif'
              }}>
                {avatarLetter}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.5px', lineHeight: 1.3 }}>
                  {candidateName}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.3 }}>
                  <BadgeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {trainee?.username || 'N/A'}
                  </Typography>
                </Stack>
              </Box>
            </Box>

            {/* Meta Stats */}
            <Stack direction="row" spacing={3}>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <CalendarTodayIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>Date</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {new Date(reportData.session.start_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <AccessTimeIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>Duration</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'DM Sans, sans-serif' }}>{formatDuration(summary.duration_seconds)}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <TrendingUpIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>Score</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'DM Sans, sans-serif', color: 'primary.main' }}>
                    {report?.aggregate_score != null ? `${Number(report.aggregate_score).toFixed(1)}/10` : '—'}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>
        </Card>

        {/* ─── AI Summary ─── */}
        {report ? (
          <Card sx={{ p: 0, overflow: 'hidden', borderLeft: '3px solid', borderColor: 'primary.main' }}>
            <Box sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <PsychologyIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.5px', fontSize: 16 }}>
                  AI Analysis
                </Typography>
                {report.ai_recommendation && (
                  <Chip
                    size="small"
                    icon={getRecChipProps(report.ai_recommendation).icon}
                    label={getRecChipProps(report.ai_recommendation).label}
                    color={getRecChipProps(report.ai_recommendation).color}
                    variant="outlined"
                    sx={{ ml: 'auto', fontWeight: 600, fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}
                  />
                )}
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.5 }}>Strengths</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
                      {report.strengths || "N/A"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(242,101,34,0.04)', border: '1px solid rgba(242,101,34,0.12)' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.5 }}>Areas to Improve</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
                      {report.areas_of_improvement || "N/A"}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Card>
        ) : (
          <Card sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>AI Evaluation is pending or failed to generate.</Typography>
          </Card>
        )}

        {/* ─── Question-by-Question Breakdown ─── */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.5px', mb: 2, fontSize: 16 }}>
            Questions & Responses ({questions.length})
          </Typography>

          <Stack spacing={2}>
            {questions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No questions were recorded for this session.</Typography>
            ) : (
              questions.map((q, index) => (
                <Card key={q.viva_question_id} sx={{ p: 0, overflow: 'hidden' }}>
                  {/* Question Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', p: { xs: 2, md: 2.5 }, pb: 0 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1 }}>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(242,101,34,0.1)', color: 'primary.main',
                        fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', mt: 0.2
                      }}>
                        {index + 1}
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                        {q.text}
                      </Typography>
                    </Stack>
                    <Chip size="small" icon={<AccessTimeIcon sx={{ fontSize: 13 }} />} label={formatDuration(q.duration)} variant="outlined"
                      sx={{ ml: 2, flexShrink: 0, fontSize: 11, fontWeight: 600, borderColor: 'rgba(0,0,0,0.1)' }}
                    />
                  </Box>

                  {/* Transcript */}
                  <Box sx={{ mx: { xs: 2, md: 2.5 }, mt: 1.5, p: 2, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic', lineHeight: 1.7 }}>
                      "{q.transcript || "(No transcript available)"}"
                    </Typography>
                    {q.evaluation?.ai_feedback && (
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, display: 'block', mb: 0.3 }}>AI Feedback</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                          {q.evaluation.ai_feedback}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Scores */}
                  <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2 }}>
                    {q.evaluation ? (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 4 }}>
                        <ScoreBar label="Communication" score={q.evaluation.score_communication || 0} color="#3b82f6" />
                        <ScoreBar label="Technical" score={q.evaluation.score_technical || 0} color="#F26522" />
                        <ScoreBar label="Confidence" score={q.evaluation.score_confidence || 0} color="#8b5cf6" />
                        {(q.fraud_flags !== undefined) && (
                          <ScoreBar 
                            label="Fraud Events" 
                            score={q.fraud_flags.length} 
                            color={q.fraud_flags.length > 0 ? "#ef4444" : "#10b981"} 
                            isCount={true}
                          />
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">No evaluation scores available.</Typography>
                    )}
                  </Box>
                </Card>
              ))
            )}
          </Stack>
        </Box>

      </Box>

      {/* ─── Sticky Decision Panel ─── */}
      <Box sx={{
        position: 'sticky',
        bottom: { xs: -16, md: -24, lg: -32 },
        zIndex: 10,
        bgcolor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
        mx: { xs: -2, md: -3, lg: -4 },
        mb: { xs: -2, md: -3, lg: -4 },
        px: { xs: 2, md: 3, lg: 4 },
        py: { xs: 2, md: 2.5 },
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        borderBottomLeftRadius: 'var(--radius)',
        borderBottomRightRadius: 'var(--radius)',
      }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' } }}>
          {/* Decision Buttons */}
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {decisionButtons.map(btn => (
              <Button
                key={btn.key}
                variant="outlined"
                onClick={() => setSelectedDecision(btn.key)}
                sx={{
                  px: 2.5, py: 0.8, fontWeight: 600, fontSize: 13,
                  borderColor: selectedDecision === btn.key ? btn.color : 'rgba(0,0,0,0.12)',
                  color: selectedDecision === btn.key ? btn.color : 'text.secondary',
                  bgcolor: selectedDecision === btn.key ? btn.bg : 'transparent',
                  '&:hover': { borderColor: btn.border, bgcolor: btn.bg },
                }}
              >
                {btn.label}
              </Button>
            ))}
          </Stack>

          {/* Notes Input */}
          <TextField
            placeholder="Add final remarks..."
            size="small"
            fullWidth
            value={trainerNotes}
            onChange={(e) => setTrainerNotes(e.target.value)}
            aria-label="Trainer notes"
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { fontSize: 14 } }}
          />

          {/* Submit */}
          <Button
            variant="contained"
            color="primary"
            endIcon={<SendIcon sx={{ fontSize: 16 }} />}
            disabled={!selectedDecision || submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await vivaService.submitDecision(sessionId, selectedDecision, trainerNotes);
                navigate('/hr/sessions');
              } catch (err) {
                console.error('Failed to submit decision:', err);
                setSubmitting(false);
              }
            }}
            sx={{ px: 3, py: 1, flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Submit Decision'}
          </Button>
        </Box>
      </Box>
    </Layout>
  );
}

function ScoreBar({ label, score, color, isCount = false }) {
  const percentage = Math.min(100, Math.max(0, (score || 0) * (isCount ? 10 : 10)));
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90, fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}>{label}</Typography>
      <Box sx={{ flex: 1, height: 6, bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
        <Box sx={{ width: `${percentage}%`, height: '100%', bgcolor: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </Box>
      <Typography variant="caption" fontWeight={700} sx={{ minWidth: 36, textAlign: 'right', fontFamily: 'DM Sans, sans-serif' }}>
        {isCount ? Math.floor(score) : Number(score).toFixed(1)}
      </Typography>
    </Stack>
  );
}
