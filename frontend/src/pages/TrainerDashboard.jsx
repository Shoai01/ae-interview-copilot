import React from 'react';
import { Box, Typography, Button, MenuItem, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Stack } from '@mui/material';
import Layout from '../components/Layout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useNavigate } from 'react-router-dom';

export default function TrainerDashboard() {
  const navigate = useNavigate();

  const sessions = [
    { name: 'Eleanor Pena', id: 'EMP-9021', module: 'Sales Obj. Handling', rec: 'Pass', status: 'Pending Review', date: 'Oct 24, 2023' },
    { name: 'Cameron Williamson', id: 'EMP-8832', module: 'Cust. Support Esc.', rec: 'Borderline', status: 'Pending Review', date: 'Oct 24, 2023' },
    { name: 'Jerome Bell', id: 'EMP-7104', module: 'Compliance Audit Q3', rec: 'Fail', status: 'Reviewed', date: 'Oct 23, 2023' },
  ];

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        
        {/* Page Header & Filters */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: 'Syne, sans-serif', mb: 0.5 }}>
              Viva Sessions
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Review AI evaluations and finalize trainee outcomes.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Select size="small" defaultValue="" displayEmpty sx={{ minWidth: 180, bgcolor: 'background.paper', borderRadius: 2 }}>
              <MenuItem value="" disabled>Filter by Module</MenuItem>
              <MenuItem value="sales">Sales Objection Handling</MenuItem>
              <MenuItem value="support">Customer Support Esc.</MenuItem>
              <MenuItem value="compliance">Compliance Audit Q3</MenuItem>
            </Select>
            <Select size="small" defaultValue="" displayEmpty sx={{ minWidth: 140, bgcolor: 'background.paper', borderRadius: 2 }}>
              <MenuItem value="" disabled>Status</MenuItem>
              <MenuItem value="pending">Pending Review</MenuItem>
              <MenuItem value="reviewed">Reviewed</MenuItem>
            </Select>
          </Box>
        </Box>

        {/* Data Table */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
          <Table sx={{ minWidth: 800 }} aria-label="sessions table">
            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
              <TableRow>
                <TableCell sx={{ textTransform: 'uppercase', color: 'text.secondary', fontWeight: 600, fontSize: '12px' }}>Trainee Name</TableCell>
                <TableCell sx={{ textTransform: 'uppercase', color: 'text.secondary', fontWeight: 600, fontSize: '12px' }}>Employee ID</TableCell>
                <TableCell sx={{ textTransform: 'uppercase', color: 'text.secondary', fontWeight: 600, fontSize: '12px' }}>Module</TableCell>
                <TableCell sx={{ textTransform: 'uppercase', color: 'text.secondary', fontWeight: 600, fontSize: '12px' }}>AI Rec.</TableCell>
                <TableCell sx={{ textTransform: 'uppercase', color: 'text.secondary', fontWeight: 600, fontSize: '12px' }}>Status</TableCell>
                <TableCell sx={{ textTransform: 'uppercase', color: 'text.secondary', fontWeight: 600, fontSize: '12px' }}>Date</TableCell>
                <TableCell align="right" sx={{ textTransform: 'uppercase', color: 'text.secondary', fontWeight: 600, fontSize: '12px' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((row) => (
                <TableRow 
                  key={row.id} 
                  hover 
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover .action-btn': { opacity: 1 } 
                  }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                  <TableCell color="text.secondary">{row.id}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'inline-flex', px: 1, py: 0.5, bgcolor: '#F1F5F9', borderRadius: 1, fontSize: '12px', fontWeight: 500, color: '#3c475b' }}>
                      {row.module}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {row.rec === 'Pass' && <CheckCircleIcon sx={{ fontSize: 18, color: '#059669' }} />}
                      {row.rec === 'Borderline' && <WarningIcon sx={{ fontSize: 18, color: '#d97706' }} />}
                      {row.rec === 'Fail' && <CancelIcon sx={{ fontSize: 18, color: '#dc2626' }} />}
                      <Typography variant="body2" sx={{ fontWeight: 500, color: row.rec === 'Pass' ? '#059669' : row.rec === 'Borderline' ? '#d97706' : '#dc2626' }}>
                        {row.rec}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={row.status} 
                      size="small" 
                      variant="outlined"
                      sx={{ 
                        height: 24, 
                        fontSize: '12px',
                        bgcolor: row.status === 'Reviewed' ? 'rgba(0,0,0,0.04)' : 'transparent',
                        borderColor: row.status === 'Reviewed' ? 'transparent' : 'divider',
                        color: 'text.secondary'
                      }} 
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{row.date}</TableCell>
                  <TableCell align="right">
                    <Button 
                      className="action-btn"
                      variant="contained" 
                      color="primary" 
                      size="small"
                      onClick={() => navigate(`/hr/review/${row.id}`)}
                      sx={{ opacity: 0, transition: 'opacity 0.2s', boxShadow: 'none' }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination Footer */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.01)' }}>
            <Typography variant="body2" color="text.secondary">
              Showing 1 to 3 of 24 entries
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button disabled size="small" sx={{ minWidth: 'auto', p: 0.5, color: 'text.secondary' }}>
                <KeyboardArrowLeftIcon />
              </Button>
              <Button size="small" sx={{ minWidth: 'auto', p: 0.5, color: 'text.secondary' }}>
                <KeyboardArrowRightIcon />
              </Button>
            </Box>
          </Box>
        </TableContainer>

      </Box>
    </Layout>
  );
}
