import React from 'react';
import { Box, Typography, Button, IconButton, Paper, InputBase, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Switch } from '@mui/material';
import Layout from '../components/Layout';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MicIcon from '@mui/icons-material/Mic';
import ChatIcon from '@mui/icons-material/Chat';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SignalCellularAlt2BarIcon from '@mui/icons-material/SignalCellularAlt2Bar';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function AdminQuestionBank() {
  const questions = [
    { text: 'Explain the difference between concurrent and parallel execution in Node.js.', type: 'Voice', difficulty: 'Hard', active: true },
    { text: 'Walk me through how you would optimize a slow-performing PostgreSQL query.', type: 'Voice', difficulty: 'Medium', active: false },
    { text: 'Describe a time you had to refactor legacy code without breaking existing functionality.', type: 'Text', difficulty: 'Medium', active: true },
  ];

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>Question Bank</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Manage AI assessment scenarios and evaluation criteria.</Typography>
          </Box>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} sx={{ boxShadow: 'none', borderRadius: 2 }}>
            Add Question
          </Button>
        </Box>

        {/* Module Tabs */}
        <Box sx={{ display: 'flex', gap: 3, borderBottom: '1px solid', borderColor: 'divider', px: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ py: 1, cursor: 'pointer', '&:hover': { color: 'text.primary' } }}>Foundation</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ py: 1, cursor: 'pointer', '&:hover': { color: 'text.primary' } }}>Intermediate</Typography>
          <Typography variant="body2" color="primary.main" sx={{ py: 1, cursor: 'pointer', fontWeight: 600, borderBottom: '2px solid', borderColor: 'primary.main' }}>Developer</Typography>
        </Box>

        {/* Search Bar */}
        <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', p: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, maxWidth: 400 }}>
          <SearchIcon sx={{ color: 'text.secondary', ml: 1 }} />
          <InputBase placeholder="Search questions..." sx={{ ml: 1, flex: 1, fontSize: 14 }} />
        </Paper>

        {/* Data Table */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Question Text</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Difficulty</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {questions.map((q, idx) => (
                <TableRow key={idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {q.text}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(0,0,0,0.04)', px: 1, py: 0.5, borderRadius: 4 }}>
                      {q.type === 'Voice' ? <MicIcon sx={{ fontSize: 14, color: 'text.secondary' }} /> : <ChatIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>{q.type}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      {q.difficulty === 'Hard' ? (
                        <SignalCellularAltIcon sx={{ fontSize: 16, color: 'error.main' }} />
                      ) : (
                        <SignalCellularAlt2BarIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      )}
                      <Typography variant="caption" sx={{ color: q.difficulty === 'Hard' ? 'error.main' : 'primary.main', fontWeight: 600 }}>{q.difficulty}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Switch checked={q.active} size="small" color="primary" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

      </Box>
    </Layout>
  );
}
