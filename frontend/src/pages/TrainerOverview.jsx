import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Stack, Button, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, IconButton, Avatar, Chip, keyframes, CircularProgress } from '@mui/material';
import Layout from '@/components/Layout';
import GroupIcon from '@mui/icons-material/Group';
import GradeIcon from '@mui/icons-material/Grade';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { adminService } from '@/services/api';

// Pulse animation for the active session indicator
const pulse = keyframes`
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(242, 101, 34, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(242, 101, 34, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(242, 101, 34, 0); }
`;

export default function TrainerOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const metrics = await adminService.getDashboardMetrics();
        setData(metrics);
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);
  
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
    border: '1px solid rgba(225,191,179,0.5)', 
    boxShadow: 'none',
    bgcolor: '#ffffff',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  };

  const iconWrapperSx = {
    w: 40, h: 40, width: 40, height: 40, 
    borderRadius: 2, 
    bgcolor: 'rgba(242, 101, 34, 0.1)', 
    color: '#F26522',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  };

  if (loading) {
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
    avg_performance_score: 0,
    active_sessions: 0,
    completion_rate: 0,
    trends: [],
    top_competencies: [],
    recent_activity: []
  };

  // Colors for competency bars
  const compColors = ["#F26522", "#009ADE", "#535f74", "#bbc7df"];

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 'calc(100vh - 120px)', bgcolor: '#f8f9ff', p: { xs: 2, md: 4 } }}>
        
        {/* Page Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0d1c2e', mb: 1 }}>
              Dashboard Overview
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px' }}>
              Real-time insights across all interview sessions.
            </Typography>
          </Box>
          <Button 
            variant="outlined" 
            startIcon={<CalendarTodayIcon fontSize="small" />}
            endIcon={<ExpandMoreIcon fontSize="small" />}
            sx={{ 
              borderColor: 'rgba(0,0,0,0.1)', color: 'text.primary', textTransform: 'none', 
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, borderRadius: 2, px: 2, py: 1,
              bgcolor: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.1)' }
            }}
          >
            All Time
          </Button>
        </Box>

        {/* Row 1: KPI Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, width: '100%' }}>
          {/* KPI 1 */}
          <Paper elevation={0} sx={cardSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={iconWrapperSx}><GroupIcon /></Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, mb: 0.5 }}>
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
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, mb: 0.5 }}>
              Avg. Performance Score
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'text.primary' }}>
              {metrics.avg_performance_score}%
            </Typography>
          </Paper>

          {/* KPI 3 */}
          <Paper elevation={0} sx={cardSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={iconWrapperSx}><RecordVoiceOverIcon /></Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, mb: 0.5 }}>
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

          {/* KPI 4 */}
          <Paper elevation={0} sx={cardSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={iconWrapperSx}><CheckCircleIcon /></Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, mb: 0.5 }}>
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
              <IconButton size="small"><MoreVertIcon /></IconButton>
            </Box>
            <Box sx={{ flex: 1, bgcolor: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 2, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Abstract Bar Chart */}
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,154,222,0.05), transparent)' }} />
              
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
                {[1, 2, 3, 4].map((i) => <Box key={i} sx={{ borderBottom: '1px solid rgba(0,0,0,0.03)', w: '100%' }} />)}
              </Box>
            </Box>
          </Paper>
          
          {/* Top Competencies */}
          <Paper elevation={0} sx={{ ...cardSx, minHeight: 400 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, mb: 3 }}>
              Top Competencies
            </Typography>
            <Stack spacing={4} sx={{ flex: 1 }}>
              {metrics.top_competencies.length > 0 ? metrics.top_competencies.map((comp, idx) => (
                <CompetencyBar key={idx} label={comp.module_name} percentage={comp.average_score} color={compColors[idx % compColors.length]} />
              )) : (
                <Typography variant="body2" color="text.secondary">No competency data available yet.</Typography>
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
              <Typography variant="caption" color="primary" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
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
                            bgcolor: activity.score ? (activity.score >= 80 ? '#10b981' : '#fb923c') : '#F26522', 
                            borderRadius: 3,
                            animation: activity.status === 'IN_PROGRESS' ? `${pulse} 2s infinite` : 'none'
                          }} />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: 'none' }}>
                      {activity.status === 'COMPLETED' ? (
                         <Chip size="small" label="Complete" sx={{ bgcolor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 1 }} />
                      ) : (
                         <Chip size="small" label="In-Progress" icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#F26522', animation: `${pulse} 2s infinite`, ml: 1 }} />} sx={{ bgcolor: 'rgba(0,0,0,0.04)', color: 'text.primary', borderRadius: 1, '& .MuiChip-icon': { color: '#F26522' } }} />
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No recent activity found.
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
              <QuickAction title="Create New Interview" subtitle="Set up a new AI session" />
              <QuickAction title="Manage Question Bank" subtitle="Edit core competencies" />
              <QuickAction title="Invite Trainers" subtitle="Add users to workspace" />
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

function QuickAction({ title, subtitle }) {
  return (
    <Box sx={{ 
      p: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      transition: 'all 0.2s',
      '&:hover': {
        borderColor: 'primary.main',
        bgcolor: 'rgba(0,154,222,0.02)',
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
