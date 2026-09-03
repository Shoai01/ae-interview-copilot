import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, Avatar, Chip, keyframes, CircularProgress, Select, MenuItem, LinearProgress, Tooltip } from '@mui/material';
import Layout from '@/components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import GroupIcon from '@mui/icons-material/Group';
import GradeIcon from '@mui/icons-material/Grade';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { adminService } from '@/services/api';

// Animations
const pulse = keyframes`
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(242, 101, 34, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(242, 101, 34, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(242, 101, 34, 0); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export default function TrainerOverview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [modules, setModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [metricsData, modulesData] = await Promise.all([
          adminService.getDashboardMetrics(activeModuleId || null),
          adminService.getModules()
        ]);
        setData(metricsData);
        if (modules.length === 0) setModules(modulesData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [activeModuleId]);
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading && !data) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress color="primary" />
        </Box>
      </Layout>
    );
  }

  // Fallback to empty structure if data failed to load
  const metrics = data || {
    total_interviews: 0,
    total_passed: 0,
    total_failed: 0,
    avg_performance_score: 0,
    active_sessions: 0,
    completion_rate: 0,
    trends: [],
    top_competencies: [],
    recent_activity: []
  };

  const passRate = metrics.total_interviews > 0 
    ? Math.round((metrics.total_passed / metrics.total_interviews) * 100) 
    : 0;

  // Donut chart colors aligned with enterprise brand palette
  const CHART_COLORS = ["#F26522", "#0EA5E9", "#10B981", "#6366F1", "#F59E0B", "#64748B"];

  // KPI card definitions with semantic enterprise palette
  const kpiCards = [
    { 
      label: 'Total Interviews', 
      value: metrics.total_interviews, 
      icon: <GroupIcon sx={{ fontSize: 20 }} />,
      lightBg: 'rgba(15, 23, 42, 0.05)',
      color: '#0F172A'
    },
    { 
      label: 'Average Score', 
      value: metrics.avg_performance_score != null ? `${Number(metrics.avg_performance_score).toFixed(1)}` : '—',
      suffix: '',
      icon: <GradeIcon sx={{ fontSize: 20 }} />,
      lightBg: 'rgba(242, 101, 34, 0.08)',
      color: '#F26522'
    },
    { 
      label: 'Passed', 
      value: metrics.total_passed,
      icon: <ThumbUpIcon sx={{ fontSize: 20 }} />,
      lightBg: 'rgba(34, 197, 94, 0.08)',
      color: '#16A34A'
    },
    { 
      label: 'Failed', 
      value: metrics.total_failed,
      icon: <ThumbDownIcon sx={{ fontSize: 20 }} />,
      lightBg: 'rgba(239, 68, 68, 0.08)',
      color: '#DC2626'
    },
    { 
      label: 'Active Now', 
      value: metrics.active_sessions,
      icon: <RecordVoiceOverIcon sx={{ fontSize: 20 }} />,
      lightBg: 'rgba(242, 101, 34, 0.1)',
      color: '#F26522',
      isPulsing: metrics.active_sessions > 0
    },
    { 
      label: 'Completion', 
      value: `${metrics.completion_rate}%`,
      icon: <CheckCircleIcon sx={{ fontSize: 20 }} />,
      lightBg: 'rgba(14, 165, 233, 0.08)',
      color: '#0284C7'
    },
  ];

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', animation: `${fadeInUp} 0.35s ease-out` }}>
        
        {/* Page Header */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', md: 'center' }, 
          gap: 2,
          pb: 0.5
        }}>
          <Box>
            <Typography variant="h4" sx={{ 
              fontWeight: 700, 
              fontFamily: 'Syne, sans-serif', 
              color: '#0F172A', 
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.4rem', md: '1.75rem' }
            }}>
              Dashboard
            </Typography>
            <Typography variant="body2" sx={{ 
              color: '#64748B', 
              fontFamily: 'DM Sans, sans-serif', 
              mt: 0.5,
              fontSize: '0.875rem'
            }}>
              Real-time insights and evaluation metrics across your viva interview sessions
            </Typography>
          </Box>

          <Select
            value={activeModuleId}
            displayEmpty
            onChange={(e) => { setActiveModuleId(e.target.value); setPage(0); }}
            size="small"
            sx={{ 
              minWidth: 190,
              bgcolor: '#FFFFFF', 
              borderRadius: 2,
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: '#0F172A',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main', borderWidth: 1.5 },
            }}
          >
            <MenuItem value="">All Modules</MenuItem>
            {modules.map(mod => (
              <MenuItem key={mod.id} value={mod.id}>{mod.name}</MenuItem>
            ))}
          </Select>
        </Box>

        {/* KPI Cards Row */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, 
          gap: 2
        }}>
          {kpiCards.map((kpi, index) => (
            <Paper 
              key={kpi.label} 
              elevation={0} 
              sx={{ 
                p: 2.25,
                borderRadius: 2.5,
                border: '1px solid #E2E8F0',
                bgcolor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                animation: `${fadeInUp} 0.4s ease-out ${index * 0.04}s both`,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.08)',
                  borderColor: '#CBD5E1',
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ 
                  fontSize: '0.72rem', 
                  fontWeight: 600, 
                  color: '#64748B', 
                  fontFamily: 'DM Sans, sans-serif',
                  textTransform: 'uppercase', 
                  letterSpacing: '0.04em',
                }}>
                  {kpi.label}
                </Typography>
                <Box sx={{ 
                  width: 32, height: 32, 
                  borderRadius: 1.5, 
                  background: kpi.lightBg,
                  color: kpi.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {kpi.icon}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography sx={{ 
                  fontSize: '1.65rem', 
                  fontWeight: 700, 
                  fontFamily: 'Syne, sans-serif', 
                  color: '#0F172A',
                  lineHeight: 1.2
                }}>
                  {kpi.value}
                </Typography>
                {kpi.suffix && (
                  <Typography sx={{ fontSize: '0.825rem', fontWeight: 600, color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
                    {kpi.suffix}
                  </Typography>
                )}
                {kpi.isPulsing && (
                  <Box sx={{ 
                    width: 7, height: 7, 
                    borderRadius: '50%', 
                    bgcolor: '#22C55E', 
                    boxShadow: '0 0 6px rgba(34, 197, 94, 0.5)',
                    ml: 0.75,
                    alignSelf: 'center'
                  }} />
                )}
              </Box>
            </Paper>
          ))}
        </Box>

        {/* Row 2: Module Performance + Quick Actions */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          
          {/* Module Performance Donut */}
          <Paper elevation={0} sx={{ 
            p: 3, 
            borderRadius: 2.5, 
            border: '1px solid #E2E8F0', 
            bgcolor: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            animation: `${fadeInUp} 0.4s ease-out 0.15s both`,
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            '&:hover': {
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.06)',
              borderColor: '#CBD5E1'
            }
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: '#0F172A' }}>
                  Module Performance
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem' }}>
                  Average evaluation scores across modules
                </Typography>
              </Box>
              {metrics.total_interviews > 0 && (
                <Chip 
                  size="small"
                  icon={passRate >= 50 ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
                  label={`${passRate}% pass rate`}
                  sx={{ 
                    bgcolor: passRate >= 50 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
                    color: passRate >= 50 ? '#16A34A' : '#DC2626',
                    border: `1px solid ${passRate >= 50 ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    fontFamily: 'DM Sans, sans-serif',
                    '& .MuiChip-icon': { color: 'inherit' }
                  }} 
                />
              )}
            </Box>
            <Box sx={{ flex: 1, width: '100%', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {metrics.top_competencies.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={metrics.top_competencies}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="average_score"
                        nameKey="module_name"
                        strokeWidth={0}
                      >
                        {metrics.top_competencies.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value) => [`${value}`, 'Avg Score']}
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: '1px solid #E2E8F0', 
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)', 
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 13,
                          padding: '8px 14px',
                          backgroundColor: '#FFFFFF',
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12 }} 
                        iconType="circle"
                        iconSize={8}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center Text */}
                  <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', top: 'calc(50% - 30px)' }}>
                    <Typography sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0F172A', fontSize: '1.75rem', lineHeight: 1 }}>
                      {metrics.avg_performance_score != null ? Number(metrics.avg_performance_score).toFixed(1) : '0.0'}
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontFamily: 'DM Sans, sans-serif', fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', mt: 0.5 }}>
                      Avg Score
                    </Typography>
                  </Box>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                    <GradeIcon sx={{ color: '#94A3B8', fontSize: 24 }} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                    No module data available yet
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem' }}>
                    Assign interviews to see performance metrics
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Quick Actions */}
          <Paper elevation={0} sx={{ 
            p: 3, 
            borderRadius: 2.5, 
            border: '1px solid #E2E8F0', 
            bgcolor: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            animation: `${fadeInUp} 0.4s ease-out 0.2s both`,
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            '&:hover': {
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.06)',
              borderColor: '#CBD5E1'
            }
          }}>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: '#0F172A' }}>
                Quick Actions
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem' }}>
                Frequently used management shortcuts
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, justifyContent: 'center' }}>
              <QuickAction 
                title="Create New Interview" 
                subtitle="Set up and assign an AI-powered session" 
                icon={<AssignmentIcon sx={{ fontSize: 20 }} />} 
                color="#F26522"
                onClick={() => navigate('/hr/sessions')} 
              />
              <QuickAction 
                title="Manage Question Bank" 
                subtitle="Add, edit or generate questions via AI" 
                icon={<MenuBookIcon sx={{ fontSize: 20 }} />} 
                color="#0EA5E9"
                onClick={() => navigate('/hr/questions')} 
              />
              <QuickAction 
                title="Manage Users" 
                subtitle="Add and administer trainees & evaluators" 
                icon={<PersonAddIcon sx={{ fontSize: 20 }} />} 
                color="#10B981"
                onClick={() => navigate('/hr/users')} 
              />
            </Box>
          </Paper>
        </Box>

        {/* Row 3: Recent Activity Table */}
        <Paper elevation={0} sx={{ 
          borderRadius: 2.5, 
          border: '1px solid #E2E8F0', 
          bgcolor: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          animation: `${fadeInUp} 0.4s ease-out 0.25s both`,
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.06)',
            borderColor: '#CBD5E1'
          }
        }}>
          <Box sx={{ 
            p: 2.5, 
            px: 3,
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: '1px solid #F1F5F9'
          }}>
            <Box>
              <Typography sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: '#0F172A' }}>
                Recent Activity
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem' }}>
                {metrics.recent_activity.length} recorded session{metrics.recent_activity.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Button
              size="small"
              endIcon={<OpenInNewIcon sx={{ fontSize: '14px !important' }} />}
              onClick={() => navigate('/hr/sessions')} 
              sx={{ 
                textTransform: 'none', 
                fontWeight: 600, 
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.825rem',
                color: 'primary.main',
                borderRadius: 1.5,
                px: 1.75,
                py: 0.5,
                border: '1px solid rgba(242, 101, 34, 0.2)',
                bgcolor: 'rgba(242, 101, 34, 0.04)',
                '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.1)', borderColor: 'primary.main' }
              }}
            >
              View All
            </Button>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  {['Candidate', 'Module', 'Date', 'Score', 'Status'].map(header => (
                    <TableCell key={header} sx={{ 
                      color: '#64748B', 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      fontSize: '0.7rem',
                      letterSpacing: '0.04em',
                      fontFamily: 'DM Sans, sans-serif',
                      borderBottom: '1px solid #E2E8F0',
                      py: 1.5,
                    }}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                  {metrics.recent_activity.length > 0 ? metrics.recent_activity.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((activity, idx) => {
                    const max = activity.max_marks || 20;
                    const pct = activity.score != null ? (activity.score / max) * 100 : 0;
                    const trainerPct = activity.trainer_score != null ? (activity.trainer_score / max) * 100 : 0;
                    const aiPct = activity.ai_score != null ? (activity.ai_score / max) * 100 : 0;
                    
                    return (
                  <TableRow 
                    hover 
                    key={idx}
                    onClick={() => navigate(`/hr/review/${activity.session_id}`)}
                    sx={{ 
                      '&:hover': { bgcolor: '#F8FAFC' },
                      transition: 'background 0.15s',
                      cursor: 'pointer'
                    }}
                  >
                    <TableCell sx={{ borderBottom: '1px solid #F1F5F9', py: 1.6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ 
                          width: 32, height: 32, 
                          bgcolor: 'rgba(242, 101, 34, 0.1)', 
                          color: 'primary.main', 
                          fontSize: 12, 
                          fontWeight: 700,
                          fontFamily: 'DM Sans, sans-serif',
                          border: '1px solid rgba(242, 101, 34, 0.2)'
                        }}>
                          {activity.trainee_initials}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'DM Sans, sans-serif', color: '#0F172A', fontSize: '0.875rem' }}>
                          {activity.trainee_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#475569', borderBottom: '1px solid #F1F5F9', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>
                      {activity.module_name}
                    </TableCell>
                    <TableCell sx={{ color: '#64748B', borderBottom: '1px solid #F1F5F9', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>
                      {activity.date}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {activity.trainer_score !== null && activity.trainer_score !== undefined ? (
                          <Tooltip title={`Trainer Reviewed (AI originally scored ${activity.ai_score ?? 'N/A'})`} placement="top">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'help' }}>
                              <Typography variant="body2" sx={{ 
                                fontWeight: 800, 
                                fontFamily: 'DM Sans, sans-serif',
                                color: '#0F172A',
                                minWidth: 28,
                                fontSize: '0.875rem'
                              }}>
                                {activity.trainer_score}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ) : (
                          <Tooltip title="AI Auto-Score" placement="top">
                            <Typography variant="body2" sx={{ 
                              fontWeight: 700, 
                              fontFamily: 'DM Sans, sans-serif',
                              color: activity.ai_score ? '#0F172A' : '#94A3B8',
                              minWidth: 28,
                              fontSize: '0.875rem',
                              cursor: 'default'
                            }}>
                              {activity.ai_score ?? '—'}
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                      <StatusChip status={activity.status} pulse={pulse} />
                    </TableCell>
                  </TableRow>
                  )}) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                      <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                        <AssignmentIcon sx={{ color: '#94A3B8' }} />
                      </Box>
                      <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                        No recent activity
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
                        Sessions will appear here once assigned
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
          {metrics.recent_activity.length > 0 && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={metrics.recent_activity.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                borderTop: '1px solid #E2E8F0',
                fontFamily: 'DM Sans, sans-serif',
                bgcolor: '#FAFBFD',
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.85rem',
                  color: '#64748B'
                }
              }}
            />
          )}
        </Paper>

      </Box>
    </Layout>
  );
}

// ---------- Sub-Components ----------

function StatusChip({ status, pulse }) {
  const config = {
    COMPLETED: { label: 'Completed', bg: 'rgba(34, 197, 94, 0.08)', color: '#16A34A', border: 'rgba(34, 197, 94, 0.25)' },
    IN_PROGRESS: { label: 'In Progress', bg: 'rgba(242, 101, 34, 0.08)', color: '#F26522', border: 'rgba(242, 101, 34, 0.25)' },
    PENDING: { label: 'Pending', bg: 'rgba(100, 116, 139, 0.08)', color: '#64748B', border: 'rgba(100, 116, 139, 0.2)' },
    EXPIRED: { label: 'Expired', bg: 'rgba(239, 68, 68, 0.08)', color: '#DC2626', border: 'rgba(239, 68, 68, 0.25)' },
  };
  const c = config[status] || config.PENDING;

  return (
    <Chip 
      size="small" 
      label={c.label}
      icon={status === 'IN_PROGRESS' ? (
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#F26522', animation: `${pulse} 2s infinite`, ml: 1 }} />
      ) : undefined}
      sx={{ 
        bgcolor: c.bg, 
        color: c.color, 
        border: `1px solid ${c.border}`,
        borderRadius: 1.5,
        fontWeight: 600,
        fontSize: '0.72rem',
        fontFamily: 'DM Sans, sans-serif',
        height: 24,
        '& .MuiChip-icon': { color: 'inherit' },
        '& .MuiChip-label': { px: 1 }
      }} 
    />
  );
}

function QuickAction({ title, subtitle, icon, color, onClick }) {
  return (
    <Box 
      onClick={onClick}
      sx={{ 
        p: 2, 
        borderRadius: 2, 
        border: '1px solid #E2E8F0', 
        bgcolor: '#FFFFFF',
        cursor: 'pointer',
        display: 'flex', 
        gap: 1.75, 
        alignItems: 'center',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: color,
          bgcolor: '#FAFBFD',
          transform: 'translateX(3px)',
          boxShadow: `0 4px 12px ${color}12`,
          '& .qa-icon': { 
            bgcolor: `${color}15`, 
            color: color,
            transform: 'scale(1.05)' 
          },
          '& .qa-title': { color: color },
          '& .qa-arrow': { opacity: 1, transform: 'translateX(0)', color: color }
        }
      }}
    >
      <Box className="qa-icon" sx={{ 
        width: 38, height: 38, 
        borderRadius: 1.5, 
        bgcolor: '#F8FAFC', 
        border: '1px solid #E2E8F0',
        color: '#64748B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease',
        flexShrink: 0
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography className="qa-title" sx={{ 
          fontWeight: 600, 
          fontFamily: 'DM Sans, sans-serif', 
          fontSize: '0.875rem',
          transition: 'color 0.18s ease',
          color: '#0F172A'
        }}>
          {title}
        </Typography>
        <Typography sx={{ 
          fontSize: '0.75rem', 
          color: '#64748B', 
          fontFamily: 'DM Sans, sans-serif',
          mt: 0.25,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {subtitle}
        </Typography>
      </Box>
      <ArrowForwardIcon className="qa-arrow" sx={{ 
        color: '#94A3B8', 
        fontSize: 16, 
        opacity: 0,
        transform: 'translateX(-4px)',
        transition: 'all 0.2s ease',
        flexShrink: 0
      }} />
    </Box>
  );
}
