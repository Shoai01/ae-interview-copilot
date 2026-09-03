import { useEffect, useState, useRef } from 'react';
import { Box, Typography, Button, Avatar, Stack, CircularProgress, Grid, Card, Chip, TextField, Alert } from '@mui/material';
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
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import LockIcon from '@mui/icons-material/Lock';
import CustomAudioPlayer from '@/components/CustomAudioPlayer';
import { vivaService } from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import toast from 'react-hot-toast';

function formatReviewTimestamp(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

export default function TrainerReviewDetail() {
  const navigate = useNavigate();
  const { id: sessionId } = useParams();
  const { user } = useAuth();

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [trainerNotes, setTrainerNotes] = useState('');
  const [finalScore, setFinalScore] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Set from the report on load, or from a 409 if another trainer reviews it
  // in the moment between us loading the page and us submitting.
  const [reviewConflict, setReviewConflict] = useState(null);
  const isSubmittedRef = useRef(false);

  // 1. Restore report & check for unsaved local review drafts
  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await vivaService.getSessionReport(sessionId);
        setReportData(data);
        if (data.report) {
          const maxMarksForSession = data.session?.max_marks || (data.questions?.length ? data.questions.length * 10 : 20);
          let decisionVal = data.report.trainer_decision || null;
          let notesVal = data.report.trainer_notes || '';
          let scoreVal = data.report.final_score != null
            ? Math.min(maxMarksForSession, Number(data.report.final_score))
            : (data.report.aggregate_score != null ? Number((data.report.aggregate_score / 10) * maxMarksForSession).toFixed(1) : '');

          // If someone else already reviewed this session, lock the form to
          // read-only for anyone but them or an admin — don't even load a
          // stale local draft over their review.
          const reviewedByOther = data.report.reviewed_by_id
            && data.report.reviewed_by_id !== user?.id
            && user?.role !== 'ADMIN';

          if (reviewedByOther) {
            setReviewConflict({
              reviewed_by_name: data.report.reviewed_by_name,
              reviewed_at: data.report.reviewed_at,
              trainer_decision: data.report.trainer_decision,
              final_score: data.report.final_score,
              trainer_notes: data.report.trainer_notes,
            });
          } else {
            // Check if trainer had an unsaved draft in session
            try {
              const savedDraft = sessionStorage.getItem(`trainer_review_draft_${sessionId}`);
              if (savedDraft) {
                const draft = JSON.parse(savedDraft);
                if (draft.selectedDecision !== undefined) decisionVal = draft.selectedDecision;
                if (draft.trainerNotes !== undefined) notesVal = draft.trainerNotes;
                if (draft.finalScore !== undefined) scoreVal = draft.finalScore;
              }
            } catch {}
          }

          setSelectedDecision(decisionVal);
          setTrainerNotes(notesVal);
          setFinalScore(scoreVal);
        }
      } catch (err) {
        console.error("Failed to fetch session report:", err);
        setError("Could not load report details.");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [sessionId]);

  // 2. Persist draft whenever trainer edits notes, decision, or score
  useEffect(() => {
    if (sessionId && (selectedDecision || trainerNotes || finalScore)) {
      try {
        sessionStorage.setItem(`trainer_review_draft_${sessionId}`, JSON.stringify({
          selectedDecision,
          trainerNotes,
          finalScore
        }));
      } catch {}
    }
  }, [sessionId, selectedDecision, trainerNotes, finalScore]);

  // 3. Tab Closure / Refresh Guard: Warn trainer if they have unsaved notes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isSubmittedRef.current && (trainerNotes || selectedDecision)) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [trainerNotes, selectedDecision]);

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: 'Dashboard', path: '/hr/dashboard' }, { label: 'Sessions', path: '/hr/sessions' }, { label: 'Session Review' }]}>
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error || !reportData) {
    return (
      <Layout breadcrumbs={[{ label: 'Dashboard', path: '/hr/dashboard' }, { label: 'Sessions', path: '/hr/sessions' }, { label: 'Session Review' }]}>
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="error">{error || "Report not found"}</Typography>
        </Box>
      </Layout>
    );
  }

  const { trainee, summary, report, questions } = reportData;
  const candidateName = trainee?.name || 'Unknown Candidate';
  const avatarLetter = candidateName.charAt(0);
  const maxMarks = reportData?.session?.max_marks || (questions?.length ? questions.length * 10 : 20);
  
  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '0m 0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // Recordings are only reachable through the authenticated per-question audio
  // route (no public static path), so CustomAudioPlayer fetches this via the
  // shared axios instance rather than treating it as a plain <audio src>.
  const getAudioSrc = (vivaQuestionId) => `/viva/${sessionId}/answer/${vivaQuestionId}/audio`;

  const getRecChipProps = (rec) => {
    if (rec === 'PASS') return { icon: <CheckCircleIcon sx={{ fontSize: 14 }} />, color: 'success', label: 'Pass' };
    if (rec === 'FAIL') return { icon: <CancelIcon sx={{ fontSize: 14 }} />, color: 'error', label: 'Fail' };
    return { icon: <WarningIcon sx={{ fontSize: 14 }} />, color: 'warning', label: 'Borderline' };
  };

  const decisionButtons = [
    { key: 'PASS', label: 'Pass', color: '#16A34A', bg: 'rgba(34, 197, 94, 0.1)', border: '#16A34A', icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> },
    { key: 'HOLD', label: 'Hold', color: '#D97706', bg: 'rgba(245, 158, 11, 0.1)', border: '#D97706', icon: <WarningIcon sx={{ fontSize: 16 }} /> },
    { key: 'FAIL', label: 'Fail', color: '#DC2626', bg: 'rgba(239, 68, 68, 0.1)', border: '#DC2626', icon: <CancelIcon sx={{ fontSize: 16 }} /> },
  ];

  return (
    <Layout breadcrumbs={[{ label: 'Dashboard', path: '/hr/dashboard' }, { label: 'Sessions', path: '/hr/sessions' }, { label: candidateName ? `Review: ${candidateName}` : 'Session Review' }]}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 16 }}>

        {/* Back Navigation */}
        <Box
          onClick={() => navigate('/hr/sessions')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/hr/sessions')}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            color: '#64748B',
            cursor: 'pointer',
            width: 'fit-content',
            '&:hover': { color: 'primary.main' },
            transition: 'color 0.15s ease',
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
            Back to Viva Sessions
          </Typography>
        </Box>

        {/* Already-reviewed-by-another-trainer notice */}
        {reviewConflict && (
          <Alert
            severity="info"
            icon={<LockIcon sx={{ fontSize: 20 }} />}
            sx={{ borderRadius: 2.5, border: '1px solid rgba(99, 102, 241, 0.25)', fontFamily: 'DM Sans, sans-serif' }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
              This session was already reviewed by {reviewConflict.reviewed_by_name || 'another trainer'}
              {formatReviewTimestamp(reviewConflict.reviewed_at) ? ` on ${formatReviewTimestamp(reviewConflict.reviewed_at)}` : ''}.
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'DM Sans, sans-serif' }}>
              Decision: <strong>{reviewConflict.trainer_decision || '—'}</strong>
              {reviewConflict.final_score != null && <> · Score: <strong>{reviewConflict.final_score}</strong></>}
              {reviewConflict.trainer_notes && <> · Notes: "{reviewConflict.trainer_notes}"</>}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
              Only they or an admin can change this review. The form below is read-only.
            </Typography>
          </Alert>
        )}

        {/* Candidate Info + Meta Stats Banner */}
        <Card elevation={0} sx={{ p: 0, overflow: 'hidden', border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', p: { xs: 2.5, md: 3 }, gap: 2.5 }}>
            {/* Candidate Identity */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{
                width: 54, height: 54,
                bgcolor: 'rgba(242, 101, 34, 0.1)',
                color: '#F26522', fontWeight: 700, fontSize: 22, fontFamily: 'Syne, sans-serif'
              }}>
                {avatarLetter}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {candidateName}
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.75 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                    {trainee?.username || 'N/A'}
                  </Typography>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#CBD5E1' }} />
                  <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, bgcolor: 'rgba(242, 101, 34, 0.08)', border: '1px solid rgba(242, 101, 34, 0.2)', borderRadius: 1, fontSize: '0.75rem', fontWeight: 600, color: '#F26522', fontFamily: 'DM Sans, sans-serif' }}>
                    {reportData.session?.module_name || 'Module'}
                  </Box>
                </Stack>
              </Box>
            </Box>

            {/* Meta Stats Tiles */}
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, px: 2, py: 1.25, minWidth: 110 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                  Exam Date
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontFamily: 'DM Sans, sans-serif', mt: 0.25 }}>
                  {reportData.session?.start_time ? new Date(reportData.session.start_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </Typography>
              </Box>

              <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, px: 2, py: 1.25, minWidth: 100 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                  Duration
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontFamily: 'DM Sans, sans-serif', mt: 0.25 }}>
                  {formatDuration(summary.duration_seconds)}
                </Typography>
              </Box>

              <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, px: 2, py: 1.25, minWidth: 110 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                  AI Score
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'Syne, sans-serif', fontSize: '1.05rem', mt: 0.25 }}>
                  {report?.aggregate_score != null ? `${Number((report.aggregate_score / 10) * maxMarks).toFixed(1)} / ${maxMarks}` : '—'}
                </Typography>
              </Box>

              <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, px: 2, py: 1.25, minWidth: 110 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                  Final Score
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontFamily: 'Syne, sans-serif', fontSize: '1.05rem', mt: 0.25 }}>
                  {report?.final_score != null ? `${Math.min(maxMarks, Number(report.final_score)).toFixed(1)} / ${maxMarks}` : '—'}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Card>

        {/* AI Analysis Summary */}
        {report ? (
          <Card elevation={0} sx={{ p: 0, overflow: 'hidden', border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box sx={{ p: { xs: 2.5, md: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: 'rgba(242, 101, 34, 0.1)', color: '#F26522', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PsychologyIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0F172A', letterSpacing: '-0.02em', fontSize: '1.05rem' }}>
                    AI Evaluation & Analysis
                  </Typography>
                </Stack>

                {report.ai_recommendation && (
                  <Chip
                    size="small"
                    icon={getRecChipProps(report.ai_recommendation).icon}
                    label={`AI Recommendation: ${getRecChipProps(report.ai_recommendation).label}`}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      fontFamily: 'DM Sans, sans-serif',
                      borderRadius: 1.5,
                      px: 1,
                      bgcolor: report.ai_recommendation === 'PASS' ? 'rgba(34, 197, 94, 0.1)' : report.ai_recommendation === 'FAIL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: report.ai_recommendation === 'PASS' ? '#16A34A' : report.ai_recommendation === 'FAIL' ? '#DC2626' : '#D97706',
                      border: '1px solid',
                      borderColor: report.ai_recommendation === 'PASS' ? 'rgba(34, 197, 94, 0.3)' : report.ai_recommendation === 'FAIL' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                    }}
                  />
                )}
              </Box>

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid rgba(34, 197, 94, 0.25)', height: '100%' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, fontFamily: 'DM Sans, sans-serif' }}>
                      <CheckCircleIcon sx={{ fontSize: 16 }} /> Key Strengths
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#334155', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.65 }}>
                      {report.strengths || "No specific strengths recorded."}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid rgba(242, 101, 34, 0.25)', height: '100%' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, fontFamily: 'DM Sans, sans-serif' }}>
                      <WarningIcon sx={{ fontSize: 16 }} /> Areas For Improvement
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#334155', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.65 }}>
                      {report.areas_of_improvement || "No specific improvements recorded."}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Card>
        ) : (
          <Card elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#FFFFFF' }}>
            <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
              AI Evaluation is pending or generating in the background.
            </Typography>
          </Card>
        )}

        {/* Trainer Remarks (if present) */}
        {report?.trainer_notes && (
          <Card elevation={0} sx={{ p: { xs: 2.5, md: 3 }, border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BadgeIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0F172A', fontSize: '1.05rem' }}>
                Trainer Review Remarks
              </Typography>
            </Stack>
            <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <Typography variant="body2" sx={{ color: '#334155', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {report.trainer_notes}
              </Typography>
            </Box>
          </Card>
        )}

        {/* Questions & Responses Section */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0F172A', letterSpacing: '-0.02em', mb: 2, fontSize: '1.1rem' }}>
            Questions & Evaluated Responses ({questions.length})
          </Typography>

          <Stack spacing={2.5}>
            {questions.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
                No questions were recorded for this session.
              </Typography>
            ) : (
              questions.map((q, index) => (
                <Card key={q.viva_question_id} elevation={0} sx={{ p: 0, overflow: 'hidden', border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)' }}>
                  {/* Question Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', p: { xs: 2, md: 2.5 }, pb: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1 }}>
                      <Box sx={{
                        width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(242, 101, 34, 0.1)', color: '#F26522',
                        fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.2
                      }}>
                        Q{index + 1}
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, pt: 0.25 }}>
                        {q.text}
                      </Typography>
                    </Stack>
                    <Chip size="small" icon={<AccessTimeIcon sx={{ fontSize: 13 }} />} label={formatDuration(q.duration)} variant="outlined"
                      sx={{ ml: 2, flexShrink: 0, fontSize: 11, fontWeight: 600, borderColor: '#E2E8F0', color: '#64748B', fontFamily: 'DM Sans, sans-serif', borderRadius: 1.5 }}
                    />
                  </Box>

                  {/* Transcript */}
                  <Box sx={{ mx: { xs: 2, md: 2.5 }, mt: 1, p: 2, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 0.5, fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Candidate Spoken Transcript
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#0F172A', fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic', lineHeight: 1.7 }}>
                      "{q.transcript || "(No spoken answer was recorded)"}"
                    </Typography>
                    {q.evaluation?.ai_feedback && (
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #E2E8F0' }}>
                        <Typography variant="caption" sx={{ color: '#F26522', fontWeight: 700, display: 'block', mb: 0.3, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.02em' }}>
                          AI Feedback
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif' }}>
                          {q.evaluation.ai_feedback}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Candidate Audio Recording */}
                  {q.audio_url && (
                    <Box sx={{ mx: { xs: 2, md: 2.5 }, mt: 1.5 }}>
                      <CustomAudioPlayer
                        src={getAudioSrc(q.viva_question_id)}
                        title={`Candidate Voice Recording (Q${index + 1})`}
                      />
                    </Box>
                  )}

                  {/* Scores Bar */}
                  <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2, bgcolor: '#FFFFFF', borderTop: '1px solid #F1F5F9' }}>
                    {q.evaluation ? (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 3.5 }}>
                        <ScoreBar label="Communication" score={q.evaluation.score_communication || 0} color="#0EA5E9" />
                        <ScoreBar label="Technical" score={q.evaluation.score_technical || 0} color="#F26522" />
                        <ScoreBar label="Confidence" score={q.evaluation.score_confidence || 0} color="#6366F1" />
                        {(q.fraud_flags !== undefined) && (
                          <ScoreBar 
                            label="Integrity Flags" 
                            score={q.fraud_flags.reduce((sum, f) => sum + (f.count || 1), 0)} 
                            color={q.fraud_flags.length > 0 ? "#EF4444" : "#10B981"} 
                            isCount={true}
                          />
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>No evaluation metrics available.</Typography>
                    )}
                  </Box>
                </Card>
              ))
            )}
          </Stack>
        </Box>

      </Box>

      {/* Fixed Trainer Decision Panel */}
      <Box sx={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        left: { xs: 0, lg: '260px' },
        zIndex: 30,
        bgcolor: '#FFFFFF',
        px: { xs: 2, sm: 3.5, lg: 4 },
        py: 2,
        borderTop: '1px solid #E2E8F0',
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.08)',
      }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' } }}>
          {/* Decision Buttons */}
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {decisionButtons.map(btn => {
              const isSelected = selectedDecision === btn.key;
              return (
                <Button
                  key={btn.key}
                  variant={isSelected ? "contained" : "outlined"}
                  onClick={() => setSelectedDecision(btn.key)}
                  disabled={!!reviewConflict}
                  startIcon={btn.icon}
                  sx={{
                    px: 2.25,
                    py: 0.9,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    fontFamily: 'DM Sans, sans-serif',
                    borderRadius: 2,
                    textTransform: 'none',
                    borderColor: isSelected ? btn.border : '#CBD5E1',
                    bgcolor: isSelected ? btn.border : 'transparent',
                    color: isSelected ? '#FFFFFF !important' : btn.color,
                    boxShadow: isSelected ? `0 2px 8px ${btn.bg}` : 'none',
                    '&:hover': {
                      borderColor: btn.border,
                      bgcolor: isSelected ? btn.border : btn.bg,
                    },
                  }}
                >
                  {btn.label}
                </Button>
              );
            })}
          </Stack>

          {/* Notes Input */}
          <TextField
            placeholder="Add final evaluator remarks or feedback for trainee..."
            size="small"
            fullWidth
            value={trainerNotes}
            onChange={(e) => setTrainerNotes(e.target.value)}
            disabled={!!reviewConflict}
            aria-label="Trainer notes"
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                bgcolor: '#F8FAFC',
                borderRadius: 2,
                '& fieldset': { borderColor: '#E2E8F0' },
                '&:hover fieldset': { borderColor: '#CBD5E1' },
              },
            }}
          />

          {/* Final Score Input */}
          <TextField
            label={`Marks (max ${maxMarks})`}
            type="number"
            size="small"
            value={finalScore}
            disabled={!!reviewConflict}
            error={parseFloat(finalScore) > maxMarks || parseFloat(finalScore) < 0}
            helperText={parseFloat(finalScore) > maxMarks ? `Max is ${maxMarks}` : parseFloat(finalScore) < 0 ? 'Cannot be negative' : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setFinalScore('');
                return;
              }
              let num = parseFloat(val);
              if (isNaN(num)) return;
              if (num < 0) {
                toast.error("Score cannot be negative", { id: 'score-limit' });
                num = 0;
              } else if (num > maxMarks) {
                toast.error(`Score cannot exceed ${maxMarks} marks`, { id: 'score-limit' });
                num = maxMarks;
              }
              setFinalScore(num);
            }}
            inputProps={{
              step: "0.5",
              min: "0",
              max: maxMarks
            }}
            sx={{
              width: 155,
              flexShrink: 0,
              '& .MuiInputLabel-root': {
                fontSize: '0.8rem',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                color: '#64748B',
              },
              '& .MuiOutlinedInput-root': {
                fontSize: '0.95rem',
                fontWeight: 700,
                fontFamily: 'Syne, sans-serif',
                bgcolor: '#FFFFFF',
                borderRadius: 2,
              },
            }}
          />

          {/* Submit Action */}
          <Button
            variant="contained"
            endIcon={<SendIcon sx={{ fontSize: 16 }} />}
            disabled={!!reviewConflict || !selectedDecision || submitting || (finalScore !== '' && (parseFloat(finalScore) < 0 || parseFloat(finalScore) > maxMarks))}
            onClick={async () => {
              if (finalScore !== '') {
                const numScore = parseFloat(finalScore);
                if (isNaN(numScore) || numScore < 0 || numScore > maxMarks) {
                  toast.error(`Please enter a valid final score between 0 and ${maxMarks}`, { id: 'score-limit' });
                  return;
                }
              }
              setSubmitting(true);
              try {
                const scoreToSend = finalScore === '' ? null : Math.min(maxMarks, Math.max(0, parseFloat(finalScore)));
                await vivaService.submitDecision(sessionId, selectedDecision, trainerNotes, scoreToSend);
                isSubmittedRef.current = true;
                try {
                  sessionStorage.removeItem(`trainer_review_draft_${sessionId}`);
                } catch {}
                toast.success("Decision and final score saved successfully", { id: 'decision-status' });
                navigate('/hr/sessions');
              } catch (err) {
                console.error('Failed to submit decision:', err);
                const detail = err.response?.data?.detail;
                // A 409 means someone else's review landed while we had this
                // page open — surface it the same way as the load-time check
                // instead of a generic error, and lock the form.
                if (err.response?.status === 409 && detail && typeof detail === 'object') {
                  setReviewConflict({
                    reviewed_by_name: detail.reviewed_by_name,
                    reviewed_at: detail.reviewed_at,
                    trainer_decision: detail.trainer_decision,
                    final_score: detail.final_score,
                    trainer_notes: detail.trainer_notes,
                  });
                  toast.error(detail.message || 'This session was already reviewed by another trainer.', { id: 'decision-status' });
                } else {
                  toast.error((typeof detail === 'string' && detail) || 'Failed to submit decision.', { id: 'decision-status' });
                }
                setSubmitting(false);
              }
            }}
            sx={{
              background: !selectedDecision ? '#E2E8F0' : 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
              color: !selectedDecision ? '#94A3B8 !important' : '#FFFFFF !important',
              px: 3.5,
              py: 1.1,
              fontWeight: 700,
              fontSize: '0.9rem',
              fontFamily: 'DM Sans, sans-serif',
              borderRadius: 2,
              flexShrink: 0,
              whiteSpace: 'nowrap',
              textTransform: 'none',
              boxShadow: !selectedDecision ? 'none' : '0 4px 14px rgba(242, 101, 34, 0.3)',
              '&:hover': {
                boxShadow: !selectedDecision ? 'none' : '0 6px 20px rgba(242, 101, 34, 0.4)',
              },
            }}
          >
            {submitting ? <CircularProgress size={18} color="inherit" /> : 'Submit Decision'}
          </Button>
        </Box>
      </Box>
    </Layout>
  );
}

// A count-based bar (e.g. fraud flag count) isn't on the 0-10 score scale —
// treat this many flags as a "full" bar instead of reusing the score's *10.
const MAX_EXPECTED_FLAG_COUNT = 5;

function ScoreBar({ label, score, color, isCount = false }) {
  const scaleFactor = isCount ? (100 / MAX_EXPECTED_FLAG_COUNT) : 10;
  const percentage = Math.min(100, Math.max(0, (score || 0) * scaleFactor));
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flex: 1 }}>
      <Typography variant="caption" sx={{ minWidth: 96, fontWeight: 600, color: '#475569', fontFamily: 'DM Sans, sans-serif', fontSize: '0.775rem' }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: 6, bgcolor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
        <Box sx={{ width: `${percentage}%`, height: '100%', bgcolor: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </Box>
      <Typography variant="caption" sx={{ minWidth: 32, textAlign: 'right', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#0F172A', fontSize: '0.8rem' }}>
        {isCount ? Math.floor(score) : Number(score).toFixed(1)}
      </Typography>
    </Stack>
  );
}
