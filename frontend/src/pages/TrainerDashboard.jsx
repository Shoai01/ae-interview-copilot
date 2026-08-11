import React from 'react';
import Layout from '../components/Layout';
import { Box, Card, CardContent, Typography, Button, Grid, Chip, Stack } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

function TrainerDashboard() {
  return (
    <Layout>
      <Box sx={{ pb: 4 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h2" gutterBottom>Trainer Review Dashboard</Typography>
            <Typography variant="body1" color="text.secondary">Welcome back. Here is the latest overview of candidate interviews.</Typography>
          </Box>
          <Button variant="contained" color="primary" startIcon={<PlayArrowIcon />}>
            Start New Viva
          </Button>
        </Stack>

        <Grid container spacing={3}>
          {/* Stats Cards */}
          {['Total Interviews', 'Pending Reviews', 'Completed Today'].map((stat, i) => (
            <Grid item xs={12} sm={4} key={i}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">{stat}</Typography>
                  <Typography variant="h3" sx={{ mt: 1 }}>
                    {i === 0 ? '124' : i === 1 ? '12' : '8'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Recent Candidates List */}
          <Grid item xs={12}>
            <Typography variant="h4" sx={{ mb: 2, mt: 4 }}>Recent Candidates</Typography>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  {[
                    { name: 'Sarah Jenkins', role: 'Senior React Developer', status: 'Completed', score: 85 },
                    { name: 'Michael Chen', role: 'Backend Engineer', status: 'In Review', score: '--' },
                    { name: 'Amanda Torres', role: 'UI/UX Designer', status: 'Scheduled', score: '--' },
                  ].map((candidate, i) => (
                    <Box key={i} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, gap: 2 }}>
                      <Box>
                        <Typography variant="h6">{candidate.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{candidate.role}</Typography>
                      </Box>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'space-between' }}>
                        <Chip 
                          label={candidate.status} 
                          size="small"
                          sx={{ 
                            bgcolor: candidate.status === 'Completed' ? 'primary.light' : 'background.default',
                            color: candidate.status === 'Completed' ? 'primary.dark' : 'text.secondary',
                          }} 
                        />
                        <Typography variant="h6" sx={{ minWidth: 40, textAlign: 'right' }}>{candidate.score}</Typography>
                        <Button variant="outlined" size="small" color="secondary">View Details</Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}

export default TrainerDashboard;
