import { Box, Typography, Grid, Paper, Stack, Button, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Avatar, Chip, keyframes } from '@mui/material';
import Layout from '../components/Layout';
import GroupIcon from '@mui/icons-material/Group';
import GradeIcon from '@mui/icons-material/Grade';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Pulse animation for the active session indicator
const pulse = keyframes`
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(242, 101, 34, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(242, 101, 34, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(242, 101, 34, 0); }
`;

export default function TrainerOverview() {
  
  const cardSx = {
    p: 3, 
    borderRadius: 3, 
    border: '1px solid rgba(0,0,0,0.04)', 
    boxShadow: '0px 4px 20px rgba(0,0,0,0.02)',
    bgcolor: 'white',
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

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
        
        {/* Page Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: 'Syne, sans-serif', mb: 0.5, letterSpacing: '-0.02em', fontSize: '32px' }}>
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
            Last 30 Days
          </Button>
        </Box>

        {/* Row 1: KPI Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, width: '100%' }}>
          {/* KPI 1 */}
          <Paper elevation={0} sx={cardSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={iconWrapperSx}><GroupIcon /></Box>
              <Chip size="small" icon={<TrendingUpIcon style={{ fontSize: 14 }}/>} label="+12%" sx={{ bgcolor: '#ecfdf5', color: '#059669', fontWeight: 700, '& .MuiChip-icon': { color: '#059669' } }} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, mb: 0.5 }}>
              Total Interviews
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'text.primary' }}>
              1,284
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
              84%
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
                42
              </Typography>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#F26522', animation: `${pulse} 2s infinite` }} />
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
              96%
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
                {[30, 45, 60, 50, 80, 75, 90].map((h, i) => (
                  <Box key={i} sx={{ 
                    width: '8%', height: `${h}%`, 
                    bgcolor: h === 80 ? 'rgba(242, 101, 34, 0.2)' : 'rgba(0,0,0,0.05)', 
                    borderTop: h === 80 ? '2px solid #F26522' : 'none',
                    borderTopLeftRadius: 4, borderTopRightRadius: 4 
                  }} />
                ))}
              </Box>
              {/* Grid Lines */}
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', py: 3, pointerEvents: 'none' }}>
                {[1, 2, 3, 4].map((i) => <Box key={i} sx={{ borderBottom: '1px solid rgba(0,0,0,0.03)', w: '100%' }} />)}
              </Box>
              <Typography variant="caption" sx={{ position: 'absolute', color: 'text.secondary', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                Chart Area: Tech Depth vs Comm Skills
              </Typography>
            </Box>
          </Paper>
          
          {/* Top Competencies */}
          <Paper elevation={0} sx={{ ...cardSx, minHeight: 400 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, mb: 3 }}>
              Top Competencies
            </Typography>
            <Stack spacing={4} sx={{ flex: 1 }}>
              <CompetencyBar label="Python Architecture" percentage={92} color="#F26522" />
              <CompetencyBar label="System Design" percentage={88} color="#009ADE" />
              <CompetencyBar label="Soft Skills & Communication" percentage={76} color="#535f74" />
              <CompetencyBar label="Cloud Infrastructure" percentage={64} color="#bbc7df" />
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
                <TableRow hover>
                  <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: 'none' }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(242, 101, 34, 0.1)', color: '#F26522', fontSize: 12, fontWeight: 'bold' }}>JD</Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>John Doe</Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>Senior Backend Engineer</TableCell>
                  <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>Oct 24, 2023</TableCell>
                  <TableCell sx={{ borderBottom: 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">95</Typography>
                      <Box sx={{ width: 60, height: 6, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 3 }}>
                        <Box sx={{ width: '95%', height: '100%', bgcolor: '#10b981', borderRadius: 3 }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: 'none' }}>
                    <Chip size="small" label="Complete" sx={{ bgcolor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 1 }} />
                  </TableCell>
                </TableRow>

                <TableRow hover>
                  <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: 'none' }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(0,154,222, 0.1)', color: '#009ADE', fontSize: 12, fontWeight: 'bold' }}>AS</Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Alice Smith</Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>Product Manager</TableCell>
                  <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>Oct 24, 2023</TableCell>
                  <TableCell sx={{ borderBottom: 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">--</Typography>
                      <Box sx={{ width: 60, height: 6, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ width: '45%', height: '100%', bgcolor: '#F26522', borderRadius: 3, animation: `${pulse} 2s infinite` }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: 'none' }}>
                    <Chip size="small" label="In-Progress" icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#F26522', animation: `${pulse} 2s infinite`, ml: 1 }} />} sx={{ bgcolor: 'rgba(0,0,0,0.04)', color: 'text.primary', borderRadius: 1, '& .MuiChip-icon': { color: '#F26522' } }} />
                  </TableCell>
                </TableRow>

                <TableRow hover>
                  <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: 'none' }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(242, 101, 34, 0.1)', color: '#F26522', fontSize: 12, fontWeight: 'bold' }}>RJ</Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Robert Jones</Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>Data Scientist</TableCell>
                  <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>Oct 23, 2023</TableCell>
                  <TableCell sx={{ borderBottom: 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">72</Typography>
                      <Box sx={{ width: 60, height: 6, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 3 }}>
                        <Box sx={{ width: '72%', height: '100%', bgcolor: '#fb923c', borderRadius: 3 }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: 'none' }}>
                    <Chip size="small" label="Complete" sx={{ bgcolor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 1 }} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
