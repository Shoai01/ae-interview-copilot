import { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Paper, InputBase, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Switch, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControl, Select, InputLabel, CircularProgress, Snackbar, Alert } from '@mui/material';
import Layout from '@/components/Layout';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SignalCellularAlt2BarIcon from '@mui/icons-material/SignalCellularAlt2Bar';
import DeleteIcon from '@mui/icons-material/Delete';
import { adminService } from '@/services/api';

export default function AdminQuestionBank() {
  const [modules, setModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog State
  const [open, setOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', difficulty: 'MEDIUM' });



  // Snackbar State
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const showSnackbar = (message, severity = 'info') => setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  };

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchModules();
  }, []);

  useEffect(() => {
    if (activeModuleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchQuestions(activeModuleId);
    }
  }, [activeModuleId]);



  const handleCreate = async () => {
    try {
      if (!newQuestion.text.trim()) return;
      await adminService.createQuestion({ ...newQuestion, module_id: activeModuleId });
      setOpen(false);
      setNewQuestion({ text: '', difficulty: 'MEDIUM' });
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
      showSnackbar(err.response?.data?.detail || "Failed to delete question. It might be in use by past sessions.", "error");
    }
  };



  const filteredQuestions = questions.filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, height: { md: 'calc(100vh - 120px)' } }}>
        
        {/* Left Sidebar: Modules */}
        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block', pl: 1 }}>Training Modules</Typography>
          {modules.map(mod => (
            <Paper 
              key={mod.id} 
              elevation={0}
              onClick={() => setActiveModuleId(mod.id)}
              sx={{ 
                p: 2, 
                cursor: 'pointer',
                borderRadius: 3,
                border: '1px solid',
                borderColor: activeModuleId === mod.id ? 'primary.main' : 'rgba(0,0,0,0.06)',
                bgcolor: activeModuleId === mod.id ? 'rgba(242, 101, 34, 0.04)' : 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: activeModuleId === mod.id ? 'primary.main' : 'text.primary' }}>
                {mod.name}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* Right Content: Questions */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>
                Question Bank
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontFamily: 'DM Sans, sans-serif' }}>
                Manage AI assessment scenarios and evaluation criteria.
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', p: 0.5, border: '1px solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 2, width: 250, transition: 'all 0.2s ease', '&:focus-within': { borderColor: 'primary.main', boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.1)' } }}>
                <SearchIcon sx={{ color: 'text.secondary', ml: 1, fontSize: 20 }} />
                <InputBase 
                  placeholder="Search questions..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ ml: 1, flex: 1, fontSize: 14, fontFamily: 'DM Sans, sans-serif' }} 
                />
              </Paper>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />} 
                sx={{ boxShadow: '0 4px 14px rgba(242, 101, 34, 0.4)', borderRadius: 2, px: 3, py: 1, fontWeight: 600, '&:hover': { boxShadow: '0 6px 20px rgba(242, 101, 34, 0.6)' } }} 
                onClick={() => setOpen(true)}
              >
                Add Question
              </Button>
            </Box>
          </Box>

          {/* Data Table */}
          <Paper elevation={0} sx={{ flexGrow: 1, borderRadius: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TableContainer sx={{ flexGrow: 1 }}>
              <Table stickyHeader sx={{ minWidth: 600 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, bgcolor: 'rgba(0,0,0,0.02)', width: 60 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>Question Text</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>Difficulty</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', py: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredQuestions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                        <Typography color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>No questions found.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredQuestions.map((q, index) => (
                    <TableRow key={q.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, transition: 'background-color 0.2s ease', '&:hover': { bgcolor: 'rgba(0,154,222,0.02)' } }}>
                      <TableCell sx={{ py: 2, color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        {index + 1}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 2, color: 'text.primary', fontWeight: 500, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        {q.text}
                      </TableCell>

                      <TableCell sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                          {q.difficulty === 'HARD' ? (
                            <SignalCellularAltIcon sx={{ fontSize: 18, color: 'error.main' }} />
                          ) : (
                            <SignalCellularAlt2BarIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                          )}
                          <Typography variant="caption" sx={{ color: q.difficulty === 'HARD' ? 'error.main' : 'primary.main', fontWeight: 700, letterSpacing: 0.5 }}>{q.difficulty}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <Switch checked={q.is_active} onChange={() => handleToggle(q.id)} size="small" color="primary" />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <IconButton size="small" onClick={() => handleDelete(q.id)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'rgba(239,68,68,0.08)' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

        </Box>
      </Box>

      {/* Add Question Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 24px 64px rgba(0,0,0,0.1)' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', pb: 1, pt: 3 }}>Add New Question</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField 
              label="Question Text" 
              multiline 
              rows={4} 
              fullWidth 
              value={newQuestion.text}
              onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>

              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={newQuestion.difficulty}
                  label="Difficulty"
                  onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="EASY">EASY</MenuItem>
                  <MenuItem value="MEDIUM">MEDIUM</MenuItem>
                  <MenuItem value="HARD">HARD</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpen(false)} color="inherit" sx={{ fontWeight: 600, borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" color="primary" disabled={!newQuestion.text.trim()} sx={{ fontWeight: 600, borderRadius: 2, px: 3, boxShadow: 'none' }}>
            Save Question
          </Button>
        </DialogActions>
      </Dialog>

      
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
