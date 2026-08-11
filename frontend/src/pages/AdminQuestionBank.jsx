import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Paper, InputBase, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Switch, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControl, Select, InputLabel } from '@mui/material';
import Layout from '../components/Layout';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MicIcon from '@mui/icons-material/Mic';
import ChatIcon from '@mui/icons-material/Chat';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SignalCellularAlt2BarIcon from '@mui/icons-material/SignalCellularAlt2Bar';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { adminService } from '../services/api';

export default function AdminQuestionBank() {
  const [modules, setModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog State
  const [open, setOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', question_type: 'VOICE', difficulty: 'MEDIUM' });

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    if (activeModuleId) {
      fetchQuestions(activeModuleId);
    }
  }, [activeModuleId]);

  const fetchModules = async () => {
    try {
      const data = await adminService.getModules();
      setModules(data);
      if (data.length > 0) setActiveModuleId(data[0].id);
    } catch (err) {
      console.error("Failed to load modules:", err);
    }
  };

  const fetchQuestions = async (moduleId) => {
    try {
      const data = await adminService.getQuestions(moduleId);
      setQuestions(data);
    } catch (err) {
      console.error("Failed to load questions:", err);
    }
  };

  const handleCreate = async () => {
    try {
      if (!newQuestion.text.trim()) return;
      await adminService.createQuestion({ ...newQuestion, module_id: activeModuleId });
      setOpen(false);
      setNewQuestion({ text: '', question_type: 'VOICE', difficulty: 'MEDIUM' });
      fetchQuestions(activeModuleId);
    } catch (err) {
      console.error("Failed to create question:", err);
    }
  };

  const handleToggle = async (questionId) => {
    try {
      await adminService.toggleQuestionStatus(questionId);
      // Optimistic update
      setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, is_active: !q.is_active } : q));
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleDelete = async (questionId) => {
    try {
      await adminService.deleteQuestion(questionId);
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    } catch (err) {
      console.error("Failed to delete question:", err);
    }
  };

  const filteredQuestions = questions.filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>Question Bank</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Manage AI assessment scenarios and evaluation criteria.</Typography>
          </Box>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} sx={{ boxShadow: 'none', borderRadius: 2 }} onClick={() => setOpen(true)}>
            Add Question
          </Button>
        </Box>

        {/* Module Tabs */}
        <Box sx={{ display: 'flex', gap: 3, borderBottom: '1px solid', borderColor: 'divider', px: 1 }}>
          {modules.map(mod => (
            <Typography 
              key={mod.id}
              onClick={() => setActiveModuleId(mod.id)}
              variant="body2" 
              sx={{ 
                py: 1, 
                cursor: 'pointer', 
                color: activeModuleId === mod.id ? 'primary.main' : 'text.secondary',
                fontWeight: activeModuleId === mod.id ? 600 : 400, 
                borderBottom: activeModuleId === mod.id ? '2px solid' : 'none', 
                borderColor: 'primary.main',
                '&:hover': { color: 'text.primary' } 
              }}
            >
              {mod.name}
            </Typography>
          ))}
        </Box>

        {/* Search Bar */}
        <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', p: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, maxWidth: 400 }}>
          <SearchIcon sx={{ color: 'text.secondary', ml: 1 }} />
          <InputBase 
            placeholder="Search questions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ ml: 1, flex: 1, fontSize: 14 }} 
          />
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
              {filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No questions found.</Typography>
                  </TableCell>
                </TableRow>
              ) : filteredQuestions.map((q) => (
                <TableRow key={q.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {q.text}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(0,0,0,0.04)', px: 1, py: 0.5, borderRadius: 4 }}>
                      {q.question_type === 'VOICE' ? <MicIcon sx={{ fontSize: 14, color: 'text.secondary' }} /> : <ChatIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>{q.question_type}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      {q.difficulty === 'HARD' ? (
                        <SignalCellularAltIcon sx={{ fontSize: 16, color: 'error.main' }} />
                      ) : (
                        <SignalCellularAlt2BarIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      )}
                      <Typography variant="caption" sx={{ color: q.difficulty === 'HARD' ? 'error.main' : 'primary.main', fontWeight: 600 }}>{q.difficulty}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Switch checked={q.is_active} onChange={() => handleToggle(q.id)} size="small" color="primary" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleDelete(q.id)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

      </Box>

      {/* Add Question Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>Add New Question</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField 
              label="Question Text" 
              multiline 
              rows={3} 
              fullWidth 
              value={newQuestion.text}
              onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newQuestion.question_type}
                  label="Type"
                  onChange={(e) => setNewQuestion({ ...newQuestion, question_type: e.target.value })}
                >
                  <MenuItem value="VOICE">VOICE</MenuItem>
                  <MenuItem value="TEXT">TEXT</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={newQuestion.difficulty}
                  label="Difficulty"
                  onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                >
                  <MenuItem value="EASY">EASY</MenuItem>
                  <MenuItem value="MEDIUM">MEDIUM</MenuItem>
                  <MenuItem value="HARD">HARD</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCreate} variant="contained" color="primary" disabled={!newQuestion.text.trim()}>
            Save Question
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
