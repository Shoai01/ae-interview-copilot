import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Stack, Button, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, IconButton, Avatar, Chip, keyframes, CircularProgress, Select, MenuItem } from '@mui/material';
import Layout from '@/components/Layout';
import GroupIcon from '@mui/icons-material/Group';
import GradeIcon from '@mui/icons-material/Grade';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { adminService } from '@/services/api';

// Pulse animation for the active session indicator
const pulse = keyframes`
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(242, 101, 34, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(242, 101, 34, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(242, 101, 34, 0); }
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
  
  const cardSx = {
    p: 3, 
    borderRadius: 3, 
    border: '1px solid rgba(0,0,0,0.08)', 
    boxShadow: 'none',
    bgcolor: '#ffffff',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  };

  const iconWrapperSx = {
    width: 40, height: 40, 
    borderRadius: 2, 
    bgcolor: 'rgba(242, 101, 34, 0.1)', 
    color: '#F26522',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
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

  // Colors for competency bars
  const compColors = ["#F26522", "#ff9800", "#4ade80", "#475569"];

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, width: '100%' }}>
        
        {/* Page Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'flex-end' }, mb: 1, gap: 2 }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'text.primary', mb: 1, letterSpacing: '-0.5px' }}>
              Dashboard Overview
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px' }}>
              Real-time insights across interview sessions.
            </Typography>
          </Box>
          <Box sx={{ minWidth: 200 }}>
            <Select
              value={activeModuleId}
              displayEmpty
              onChange={(e) => setActiveModuleId(e.target.value)}
              size="small"
              sx={{ width: '100%', bgcolor: 'white', borderRadius: 2 }}
            >
              <MenuItem value="">All Modules</MenuItem>
              {modules.map(mod => (
                <MenuItem key={mod.id} value={mod.id}>{mod.name}</MenuItem>
              ))}
            </Select>
          </Box>
        </Box>

        {/* Row 1: KPI Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2, width: '100%' }}>
          {/* KPI 1 */}
          <Paper elevation={0} sx={cardSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={iconWrapperSx}><GroupIcon /></Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, mb: 0.5, whiteSpace: 'nowrap' }}>
              Total Interviews
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'text.primary' }}>
              {metrics.total_interviews}
            </Typography>
          </Paper>
          
          {/* KPI 2 */}
          <Paper elevation={0} sx={cardSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={iconWrapperSx}><GradeIcon /></Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, mb: 0.5, whiteSpace: 'nowrap' }}>
              Avg Score
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'text.primary' }}>
              {metrics.avg_performance_score}
            </Typography>
          </Paper>

          {/* KPI 3 */}
          <Paper elevation={0} sx={cardSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ ...iconWrapperSx, bgcolor: 'rgba(74, 222, 128, 0.1)', color: 'success.main' }}><ThumbUpIcon /></Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, mb: 0.5, whiteSpace: 'nowrap' }}>
              Passed
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'text.primary' }}>
              {metrics.total_passed}
            </Typography>
          </Paper>

          {/* KPI 4 */}
          <Paper elevation={0} sx={cardSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ ...iconWrapperSx, bgcolor: 'rgba(239, 68, 68, 0.1)', color: 'error.main' }}><ThumbDownIcon /></Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, mb: 0.5, whiteSpace: 'nowrap' }}>
              Failed
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'text.primary' }}>
              {metrics.total_failed}
            </Typography>
          </Paper>

          {/* KPI 5 */}
          <Paper elevation={0} sx={cardSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={iconWrapperSx}><RecordVoiceOverIcon /></Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, mb: 0.5, whiteSpace: 'nowrap' }}>
              Active Sessions
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h4" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'text.primary' }}>
                {metrics.active_sessions}
              </Typography>
              {metrics.active_sessions > 0 && (
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#F26522', animation: `${pulse} 2s infinite` }} />
              )}
            </Box>
          </Paper>

          {/* KPI 6 */}
          <Paper elevation={0} sx={cardSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={iconWrapperSx}><CheckCircleIcon /></Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, mb: 0.5, whiteSpace: 'nowrap' }}>
              Completion Rate
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'text.primary' }}>
              {metrics.completion_rate}%
            </Typography>
          </Paper>
        </Box>

        {/* Row 2: Charts & Progress */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, width: '100%' }}>
          {/* Chart Area */}
          <Paper elevation={0} sx={{ ...cardSx, minHeight: 400 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>
                Interview Performance Trends
              </Typography>
            </Box>
            <Box sx={{ flex: 1, bgcolor: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 2, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Abstract Bar Chart */}
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(242, 101, 34, 0.05), transparent)' }} />
              
              <Box sx={{ width: '100%', height: '100%', px: 4, py: 2, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', opacity: 0.7 }}>
                {metrics.trends.length > 0 ? metrics.trends.map((t, i) => (
                  <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: `${100 / Math.max(7, metrics.trends.length)}%` }}>
                    <Box sx={{ 
                      width: '60%', height: `${t.average_score}%`, 
                      bgcolor: 'rgba(0,0,0,0.05)', 
                      borderTop: t.average_score >= 80 ? '2px solid #F26522' : 'none',
                      borderTopLeftRadius: 4, borderTopRightRadius: 4 
                    }} />
                    <Typography variant="caption" sx={{ mt: 1, fontSize: 10, color: 'text.secondary', whiteSpace: 'nowrap' }}>{t.label}</Typography>
                  </Box>
                )) : (
                  <Typography variant="body2" sx={{ m: 'auto', color: 'text.secondary' }}>No trend data available.</Typography>
                )}
              </Box>

              {/* Grid Lines */}
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', py: 3, pointerEvents: 'none' }}>
                {[1, 2, 3, 4].map((i) => <Box key={i} sx={{ borderBottom: '1px solid rgba(0,0,0,0.03)', width: '100%' }} />)}
              </Box>
            </Box>
          </Paper>
          
          {/* Top Competencies */}
          <Paper elevation={0} sx={{ ...cardSx, minHeight: 400 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, mb: 3 }}>
              Module Performance
            </Typography>
            <Stack spacing={4} sx={{ flex: 1 }}>
              {metrics.top_competencies.length > 0 ? metrics.top_competencies.map((comp, idx) => (
                <CompetencyBar key={idx} label={comp.module_name} percentage={comp.average_score} color={compColors[idx % compColors.length]} />
              )) : (
                <Typography variant="body2" color="text.secondary">No module data available yet.</Typography>
              )}
            </Stack>
          </Paper>
        </Box>

        {/* Row 3: Table and Actions */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, width: '100%' }}>
          {/* Recent Activity Table */}
          <Paper elevation={0} sx={{ ...cardSx, p: 0, overflow: 'hidden' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>
                Recent Activity
              </Typography>
              <Typography onClick={() => navigate('/hr/sessions')} variant="caption" color="primary" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                View All
              </Typography>
            </Box>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>Candidate</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>Role</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>Date</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>Score</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.recent_activity.length > 0 ? metrics.recent_activity.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((activity, idx) => (
                  <TableRow hover key={idx}>
                    <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: 'none' }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: compColors[idx % compColors.length] + '20', color: compColors[idx % compColors.length], fontSize: 12, fontWeight: 'bold' }}>
                        {activity.trainee_initials}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{activity.trainee_name}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>{activity.module_name}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>{activity.date}</TableCell>
                    <TableCell sx={{ borderBottom: 'none' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color={activity.score ? 'text.primary' : 'text.secondary'}>
                          {activity.score ?? '--'}
                        </Typography>
                        <Box sx={{ width: 60, height: 6, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                          <Box sx={{ 
                            width: activity.score ? `${activity.score}%` : (activity.status === 'IN_PROGRESS' ? '45%' : '0%'), 
                            height: '100%', 
                            bgcolor: activity.score ? (activity.score >= 80 ? 'success.main' : 'warning.main') : 'primary.main', 
                            borderRadius: 3,
                            animation: activity.status === 'IN_PROGRESS' ? `${pulse} 2s infinite` : 'none'
                          }} />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: 'none' }}>
                      {activity.status === 'COMPLETED' ? (
                         <Chip size="small" label="Complete" sx={{ bgcolor: 'rgba(74, 222, 128, 0.1)', color: 'success.dark', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: 1 }} />
                      ) : (
                         <Chip size="small" label="In-Progress" icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', animation: `${pulse} 2s infinite`, ml: 1 }} />} sx={{ bgcolor: 'rgba(0,0,0,0.04)', color: 'text.primary', borderRadius: 1, '& .MuiChip-icon': { color: 'primary.main' } }} />
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, borderBottom: 'none' }}>
                      <Typography variant="body2" color="text.secondary">No recent activity.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={metrics.recent_activity.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>

          {/* Quick Actions */}
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="h6" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, mb: 2 }}>
              Quick Actions
            </Typography>
            <Stack spacing={2}>
              <QuickAction title="Create New Interview" subtitle="Set up a new AI session" onClick={() => navigate('/hr/sessions')} />
              <QuickAction title="Manage Question Bank" subtitle="Edit core competencies" onClick={() => navigate('/hr/questions')} />
              <QuickAction title="Invite Trainers" subtitle="Add users to workspace" onClick={() => navigate('/hr/users')} />
            </Stack>
          </Paper>
        </Box>

      </Box>
    </Layout>
  );
}

function CompetencyBar({ label, percentage, color }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}>{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{percentage}%</Typography>
      </Box>
      <Box sx={{ width: '100%', height: 8, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ width: `${percentage}%`, height: '100%', bgcolor: color, borderRadius: 4 }} />
      </Box>
    </Box>
  );
}

function QuickAction({ title, subtitle, onClick }) {
  return (
    <Box 
      onClick={onClick}
      sx={{ 
      p: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      transition: 'all 0.2s',
      '&:hover': {
        borderColor: 'primary.main',
        bgcolor: 'rgba(242,101,34,0.04)',
        '& .icon': { color: 'primary.main' },
        '& .title': { color: 'primary.main' }
      }
    }}>
      <Box>
        <Typography className="title" variant="body2" sx={{ fontWeight: 700, fontFamily: 'DM Sans, sans-serif', transition: 'color 0.2s' }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {subtitle}
        </Typography>
      </Box>
      <ArrowForwardIcon className="icon" sx={{ color: 'text.secondary', transition: 'color 0.2s', fontSize: 20 }} />
    </Box>
  );
}
