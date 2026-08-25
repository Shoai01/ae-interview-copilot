import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, Avatar, Chip, keyframes, CircularProgress, Select, MenuItem, LinearProgress } from '@mui/material';
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

  // Donut chart colors
  const CHART_COLORS = ["#F26522", "#3b82f6", "#22c55e", "#a855f7", "#eab308", "#06b6d4"];

  // KPI card definitions
  const kpiCards = [
    { 
      label: 'Total Interviews', 
      value: metrics.total_interviews, 
      icon: <GroupIcon sx={{ fontSize: 22 }} />,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      lightBg: 'rgba(102, 126, 234, 0.08)',
      color: '#667eea'
    },
    { 
      label: 'Average Score', 
      value: metrics.avg_performance_score != null ? `${Number(metrics.avg_performance_score).toFixed(1)}` : '—',
      suffix: '/10',
      icon: <GradeIcon sx={{ fontSize: 22 }} />,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      lightBg: 'rgba(245, 87, 108, 0.08)',
      color: '#f5576c'
    },
    { 
      label: 'Passed', 
      value: metrics.total_passed,
      icon: <ThumbUpIcon sx={{ fontSize: 22 }} />,
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      lightBg: 'rgba(67, 233, 123, 0.08)',
      color: '#22c55e'
    },
    { 
      label: 'Failed', 
      value: metrics.total_failed,
      icon: <ThumbDownIcon sx={{ fontSize: 22 }} />,
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      lightBg: 'rgba(250, 112, 154, 0.08)',
      color: '#ef4444'
    },
    { 
      label: 'Active Now', 
      value: metrics.active_sessions,
      icon: <RecordVoiceOverIcon sx={{ fontSize: 22 }} />,
      gradient: 'linear-gradient(135deg, #F26522 0%, #ff9a44 100%)',
      lightBg: 'rgba(242, 101, 34, 0.08)',
      color: '#F26522',
      isPulsing: metrics.active_sessions > 0
    },
    { 
      label: 'Completion', 
      value: `${metrics.completion_rate}%`,
      icon: <CheckCircleIcon sx={{ fontSize: 22 }} />,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      lightBg: 'rgba(79, 172, 254, 0.08)',
      color: '#3b82f6'
    },
  ];

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', animation: `${fadeInUp} 0.4s ease-out` }}>
        
        {/* Page Header */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', md: 'center' }, 
          gap: 2,
          pb: 1
        }}>
          <Box>
            <Typography variant="h4" sx={{ 
              fontWeight: 800, 
              fontFamily: 'Syne, sans-serif', 
              color: '#0a1628', 
              letterSpacing: '-0.5px',
              fontSize: { xs: '1.5rem', md: '2rem' }
            }}>
              Dashboard
            </Typography>
            <Typography variant="body2" sx={{ 
              color: 'text.secondary', 
              fontFamily: 'DM Sans, sans-serif', 
              mt: 0.5,
              fontSize: '0.875rem'
            }}>
              Real-time insights across your interview sessions
            </Typography>
          </Box>

          <Select
            value={activeModuleId}
            displayEmpty
            onChange={(e) => setActiveModuleId(e.target.value)}
            size="small"
            sx={{ 
              minWidth: 180,
              bgcolor: '#fff', 
              borderRadius: 2,
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '0.875rem',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.1)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(242, 101, 34, 0.4)' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#F26522', borderWidth: 1.5 },
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
                p: 2.5,
                borderRadius: 3,
                border: '1px solid rgba(0,0,0,0.06)',
                bgcolor: '#fff',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: `${fadeInUp} 0.5s ease-out ${index * 0.05}s both`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 28px -4px rgba(0,0,0,0.15)',
                  borderColor: 'rgba(0,0,0,0.15)',
                  '& .kpi-icon-box': {
                    transform: 'scale(1.1) rotate(5deg)',
                  }
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: kpi.gradient,
                  borderRadius: '12px 12px 0 0',
                }
              }}
            >
              <Box className="kpi-icon-box" sx={{ 
                width: 36, height: 36, 
                borderRadius: 2, 
                background: kpi.lightBg,
                color: kpi.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mb: 1.5,
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                {kpi.icon}
              </Box>
              <Typography sx={{ 
                fontSize: '0.7rem', 
                fontWeight: 600, 
                color: 'text.secondary', 
                fontFamily: 'DM Sans, sans-serif',
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                mb: 0.5
              }}>
                {kpi.label}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography sx={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 800, 
                  fontFamily: 'Syne, sans-serif', 
                  color: '#0a1628',
                  lineHeight: 1.2
                }}>
                  {kpi.value}
                </Typography>
                {kpi.suffix && (
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary' }}>
                    {kpi.suffix}
                  </Typography>
                )}
                {kpi.isPulsing && (
                  <Box sx={{ 
                    width: 8, height: 8, 
                    borderRadius: '50%', 
                    bgcolor: '#F26522', 
                    animation: `${pulse} 2s infinite`,
                    ml: 0.5
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
            borderRadius: 3, 
            border: '1px solid rgba(0,0,0,0.06)', 
            bgcolor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            animation: `${fadeInUp} 0.5s ease-out 0.3s both`,
            transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
            '&:hover': {
              boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)',
              borderColor: 'rgba(0,0,0,0.1)'
            }
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#0a1628' }}>
                  Module Performance
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Average scores by module
                </Typography>
              </Box>
              {metrics.total_interviews > 0 && (
                <Chip 
                  size="small"
                  icon={passRate >= 50 ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
                  label={`${passRate}% pass rate`}
                  sx={{ 
                    bgcolor: passRate >= 50 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', 
                    color: passRate >= 50 ? '#16a34a' : '#dc2626',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    fontFamily: 'DM Sans, sans-serif',
                    border: 'none',
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
                        formatter={(value) => [`${value}%`, 'Avg Score']}
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: 'none', 
                          boxShadow: '0 4px 20px rgba(0,0,0,0.12)', 
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 13,
                          padding: '8px 14px'
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
                    <Typography sx={{ fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#0a1628', fontSize: '1.8rem', lineHeight: 1 }}>
                      {metrics.avg_performance_score != null ? Number(metrics.avg_performance_score).toFixed(1) : '0.0'}
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontFamily: 'DM Sans, sans-serif', fontSize: '0.65rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '1px', mt: 0.3 }}>
                      Avg Score
                    </Typography>
                  </Box>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                    <GradeIcon sx={{ color: 'text.disabled', fontSize: 28 }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
                    No module data available yet
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
                    Assign interviews to see performance metrics
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Quick Actions */}
          <Paper elevation={0} sx={{ 
            p: 3, 
            borderRadius: 3, 
            border: '1px solid rgba(0,0,0,0.06)', 
            bgcolor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            animation: `${fadeInUp} 0.5s ease-out 0.35s both`,
            transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
            '&:hover': {
              boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)',
              borderColor: 'rgba(0,0,0,0.1)'
            }
          }}>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#0a1628' }}>
                Quick Actions
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
                Jump to common tasks
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
              <QuickAction 
                title="Create New Interview" 
                subtitle="Set up and assign an AI-powered session" 
                icon={<AssignmentIcon />} 
                color="#F26522"
                onClick={() => navigate('/hr/sessions')} 
              />
              <QuickAction 
                title="Manage Question Bank" 
                subtitle="Add, edit or generate questions via AI" 
                icon={<MenuBookIcon />} 
                color="#3b82f6"
                onClick={() => navigate('/hr/questions')} 
              />
              <QuickAction 
                title="Manage Users" 
                subtitle="Add trainees and trainers" 
                icon={<PersonAddIcon />} 
                color="#22c55e"
                onClick={() => navigate('/hr/users')} 
              />
            </Box>
          </Paper>
        </Box>

        {/* Row 3: Recent Activity Table */}
        <Paper elevation={0} sx={{ 
          borderRadius: 3, 
          border: '1px solid rgba(0,0,0,0.06)', 
          bgcolor: '#fff',
          overflow: 'hidden',
          animation: `${fadeInUp} 0.5s ease-out 0.4s both`,
          transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)',
            borderColor: 'rgba(0,0,0,0.1)'
          }
        }}>
          <Box sx={{ 
            p: 3, 
            pb: 2,
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: '1px solid rgba(0,0,0,0.04)'
          }}>
            <Box>
              <Typography sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#0a1628' }}>
                Recent Activity
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
                {metrics.recent_activity.length} session{metrics.recent_activity.length !== 1 ? 's' : ''} found
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
                fontSize: '0.8rem',
                color: '#F26522',
                borderRadius: 2,
                px: 2,
                '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.06)' }
              }}
            >
              View All
            </Button>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  {['Candidate', 'Module', 'Date', 'Score', 'Status'].map(header => (
                    <TableCell key={header} sx={{ 
                      color: 'text.secondary', 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      fontSize: '0.68rem',
                      letterSpacing: '0.5px',
                      fontFamily: 'DM Sans, sans-serif',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                      py: 1.5,
                      bgcolor: 'rgba(0,0,0,0.015)'
                    }}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.recent_activity.length > 0 ? metrics.recent_activity.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((activity, idx) => (
                  <TableRow 
                    hover 
                    key={idx}
                    sx={{ 
                      '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.02)' },
                      transition: 'background 0.15s',
                      cursor: 'default'
                    }}
                  >
                    <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)', py: 1.8 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ 
                          width: 34, height: 34, 
                          bgcolor: CHART_COLORS[idx % CHART_COLORS.length] + '18', 
                          color: CHART_COLORS[idx % CHART_COLORS.length], 
                          fontSize: 12, 
                          fontWeight: 700,
                          fontFamily: 'DM Sans, sans-serif'
                        }}>
                          {activity.trainee_initials}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'DM Sans, sans-serif', color: '#0a1628' }}>
                          {activity.trainee_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.04)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>
                      {activity.module_name}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.04)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>
                      {activity.date}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 700, 
                          fontFamily: 'DM Sans, sans-serif',
                          color: activity.score ? (activity.score >= 80 ? '#16a34a' : activity.score >= 50 ? '#d97706' : '#dc2626') : 'text.disabled',
                          minWidth: 28
                        }}>
                          {activity.score ?? '—'}
                        </Typography>
                        <Box sx={{ width: 50, height: 4, bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <Box sx={{ 
                            width: activity.score ? `${activity.score}%` : (activity.status === 'IN_PROGRESS' ? '45%' : '0%'), 
                            height: '100%', 
                            bgcolor: activity.score 
                              ? (activity.score >= 80 ? '#22c55e' : activity.score >= 50 ? '#eab308' : '#ef4444') 
                              : '#F26522', 
                            borderRadius: 2,
                            transition: 'width 0.5s ease',
                            animation: activity.status === 'IN_PROGRESS' ? `${shimmer} 2s infinite` : 'none',
                            backgroundSize: activity.status === 'IN_PROGRESS' ? '200% 100%' : 'auto',
                            backgroundImage: activity.status === 'IN_PROGRESS' 
                              ? 'linear-gradient(90deg, #F26522 25%, #ff9a44 50%, #F26522 75%)' 
                              : 'none'
                          }} />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <StatusChip status={activity.status} pulse={pulse} />
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                      <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                        <AssignmentIcon sx={{ color: 'text.disabled' }} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
                        No recent activity
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
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
                borderTop: '1px solid rgba(0,0,0,0.04)',
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.8rem'
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
    COMPLETED: { label: 'Completed', bg: 'rgba(34,197,94,0.1)', color: '#16a34a', border: 'rgba(34,197,94,0.2)' },
    IN_PROGRESS: { label: 'In Progress', bg: 'rgba(242,101,34,0.08)', color: '#F26522', border: 'rgba(242,101,34,0.2)' },
    PENDING: { label: 'Pending', bg: 'rgba(0,0,0,0.04)', color: '#64748b', border: 'rgba(0,0,0,0.08)' },
    EXPIRED: { label: 'Expired', bg: 'rgba(239,68,68,0.08)', color: '#dc2626', border: 'rgba(239,68,68,0.2)' },
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
        borderRadius: 2,
        fontWeight: 600,
        fontSize: '0.7rem',
        fontFamily: 'DM Sans, sans-serif',
        height: 26,
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
        p: 2.5, 
        borderRadius: 2.5, 
        border: '1px solid rgba(0,0,0,0.06)', 
        cursor: 'pointer',
        display: 'flex', 
        gap: 2, 
        alignItems: 'center',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          borderColor: color,
          bgcolor: `${color}08`,
          transform: 'translateX(4px)',
          boxShadow: `0 4px 12px ${color}15`,
          '& .qa-icon': { 
            bgcolor: `${color}15`, 
            color: color,
            transform: 'scale(1.05)' 
          },
          '& .qa-title': { color: color },
          '& .qa-arrow': { opacity: 1, transform: 'translateX(0)' }
        }
      }}
    >
      <Box className="qa-icon" sx={{ 
        width: 42, height: 42, 
        borderRadius: 2, 
        bgcolor: 'rgba(0,0,0,0.04)', 
        color: 'text.secondary',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.25s ease',
        flexShrink: 0
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography className="qa-title" sx={{ 
          fontWeight: 700, 
          fontFamily: 'DM Sans, sans-serif', 
          fontSize: '0.875rem',
          transition: 'color 0.2s',
          color: '#0a1628'
        }}>
          {title}
        </Typography>
        <Typography sx={{ 
          fontSize: '0.75rem', 
          color: 'text.secondary', 
          fontFamily: 'DM Sans, sans-serif',
          mt: 0.3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {subtitle}
        </Typography>
      </Box>
      <ArrowForwardIcon className="qa-arrow" sx={{ 
        color: 'text.disabled', 
        fontSize: 16, 
        opacity: 0,
        transform: 'translateX(-4px)',
        transition: 'all 0.25s ease',
        flexShrink: 0
      }} />
    </Box>
  );
}
