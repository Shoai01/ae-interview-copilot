import { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, InputBase, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Switch, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControl, Select, InputLabel, CircularProgress, Snackbar, Alert, Card, Tooltip, Chip } from '@mui/material';
import Layout from '@/components/Layout';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SyncIcon from '@mui/icons-material/Sync';
import { adminService } from '@/services/api';

export default function AdminQuestionBank() {
  const [modules, setModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSet, setActiveSet] = useState('All Sets');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog State
  const [open, setOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', ideal_answer: '', difficulty: 'MEDIUM', setNameSelection: '' });
  const [openGenerate, setOpenGenerate] = useState(false);
  const [generateConfig, setGenerateConfig] = useState({ count: 15 });
  const [isGenerating, setIsGenerating] = useState(false);
  // Edit Question State
  const [editMode, setEditMode] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState(null);

  // Set Management State
  
  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', id: null, name: '' });

  const [openRenameSet, setOpenRenameSet] = useState(false);
  const [renameSetInput, setRenameSetInput] = useState('');




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

  const [loading, setLoading] = useState(false);

  const fetchQuestions = async (moduleId) => {
    setLoading(true);
    try {
      const data = await adminService.getQuestions(moduleId);
      setQuestions(data);
    } catch (err) {
      console.error("Failed to load questions:", err);
    } finally {
      setLoading(false);
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
      setPage(0);
      setActiveSet('All Sets');
    }
  }, [activeModuleId]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };



  const handleOpenEdit = (q) => {
    setEditMode(true);
    setEditQuestionId(q.id);
    setNewQuestion({ text: q.text, ideal_answer: q.ideal_answer || '', difficulty: q.difficulty, setNameSelection: q.set_name || 'Default Set' });
    setOpen(true);
  };

  const handleOpenCreate = () => {
    setEditMode(false);
    setEditQuestionId(null);
    setNewQuestion({ text: '', ideal_answer: '', difficulty: 'MEDIUM', setNameSelection: '' });
    setOpen(true);
  };

  const handleSaveQuestion = async () => {
    try {
      if (!newQuestion.text.trim()) return;
      const finalSetName = newQuestion.setNameSelection === '+ Auto-Create New Set' ? nextAvailableSetName : newQuestion.setNameSelection;
      
      if (editMode) {
        await adminService.updateQuestion(editQuestionId, { ...newQuestion, set_name: finalSetName });
        showSnackbar("Question updated successfully!", "success");
      } else {
        await adminService.createQuestion({ ...newQuestion, set_name: finalSetName, module_id: activeModuleId });
        showSnackbar("Question created successfully!", "success");
      }
      setOpen(false);
      fetchQuestions(activeModuleId);
    } catch (err) {
      console.error("Failed to save question:", err);
      showSnackbar("Failed to save question.", "error");
    }
  };

  const handleConfirmDelete = async () => {
    const { type, id, name } = deleteConfirm;
    setDeleteConfirm({ open: false, type: '', id: null, name: '' });
    
    if (type === 'SET') {
      try {
        await adminService.deleteSet(activeModuleId, name);
        showSnackbar(`Set "${name}" deleted. (If questions were in use, they were deactivated instead).`, "success");
        if (activeSet === name) setActiveSet('All Sets');
        fetchQuestions(activeModuleId);
      } catch (err) {
        console.error("Failed to delete set:", err);
        showSnackbar("Failed to delete set.", "error");
      }
    } else if (type === 'QUESTION') {
      try {
        await adminService.deleteQuestion(id);
        setQuestions(prev => prev.filter(q => q.id !== id));
        showSnackbar("Question deleted.", "success");
      } catch (err) {
        console.error("Failed to delete question:", err);
        showSnackbar(err.response?.data?.detail || "Failed to delete question. It might be in use.", "error");
      }
    }
  };

  const handleDeleteSet = () => {
    if (activeSet === 'All Sets' || activeSet === 'Default Set') return;
    setDeleteConfirm({ open: true, type: 'SET', id: null, name: activeSet });
  };

  const handleRenameSet = async () => {
    if (!renameSetInput.trim() || activeSet === 'All Sets' || activeSet === 'Default Set') return;
    
    try {
      await adminService.renameSet(activeModuleId, activeSet, renameSetInput.trim());
      showSnackbar(`Set renamed to "${renameSetInput.trim()}"`, "success");
      setActiveSet(renameSetInput.trim());
      setOpenRenameSet(false);
      fetchQuestions(activeModuleId);
    } catch (err) {
      console.error("Failed to rename set:", err);
      showSnackbar("Failed to rename set.", "error");
    }
  };

  const handleGenerateAISet = async () => {
    try {
      setIsGenerating(true);
      await adminService.generateSetViaAI(activeModuleId, nextAvailableSetName, generateConfig.count);
      setOpenGenerate(false);
      showSnackbar(`Successfully generated ${generateConfig.count} questions for ${nextAvailableSetName}!`, "success");
      fetchQuestions(activeModuleId);
    } catch (err) {
      console.error("Failed to generate set:", err);
      showSnackbar(err.response?.data?.detail || "Failed to generate AI set.", "error");
    } finally {
      setIsGenerating(false);
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

  const handleDelete = (questionId) => { setDeleteConfirm({ open: true, type: 'QUESTION', id: questionId, name: '' }); };



  const uniqueSets = ['All Sets', ...new Set(questions.map(q => q.set_name || 'Default Set'))];
  const existingSetsOnly = uniqueSets.filter(s => s !== 'All Sets' && s !== 'Default Set');
  
  // Calculate next available set name
  let nextAvailableSetName = 'Module_Set_A';
  if (activeModuleId) {
    const activeModule = modules.find(m => m.id === activeModuleId);
    if (activeModule) {
      const prefix = activeModule.name.replace(/[^a-zA-Z0-9]/g, '_') + "_Set_";
      const matchingSets = existingSetsOnly.filter(s => s.startsWith(prefix));
      
      if (matchingSets.length === 0) {
        nextAvailableSetName = prefix + "A";
      } else {
        const suffixes = matchingSets.map(s => s.substring(prefix.length));
        const letterToNum = (str) => {
          let out = 0, len = str.length;
          for (let pos = 0; pos < len; pos++) {
            out += (str.charCodeAt(pos) - 64) * Math.pow(26, len - pos - 1);
          }
          return out;
        };
        const numToLetter = (num) => {
          let out = "";
          while (num > 0) {
            let rem = (num - 1) % 26;
            out = String.fromCharCode(65 + rem) + out;
            num = Math.floor((num - 1) / 26);
          }
          return out;
        };
        
        const nums = suffixes.map(letterToNum).filter(n => !isNaN(n));
        const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
        nextAvailableSetName = prefix + numToLetter(maxNum + 1);
      }
    }
  }

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSet = activeSet === 'All Sets' || (q.set_name || 'Default Set') === activeSet;
    return matchesSearch && matchesSet;
  });
  const paginatedQuestions = filteredQuestions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, width: '100%' }}>
        
        {/* Header & Actions */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h3" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'text.primary', mb: 1, letterSpacing: '-0.5px' }}>
                  Question Bank
                </Typography>
                <IconButton onClick={() => fetchQuestions(activeModuleId)} size="medium" disabled={!activeModuleId || loading} sx={{ color: 'primary.main', bgcolor: 'rgba(242,101,34,0.1)', '&:hover': { bgcolor: 'rgba(242,101,34,0.2)' } }}>
                  <SyncIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                </IconButton>
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
                Manage and organize your AI training scenarios.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: { xs: 2, md: 0 } }}>
            <Button 
              variant="outlined" 
              startIcon={<AutoAwesomeIcon />} 
              sx={{ px: 3, py: 1 }} 
              onClick={() => setOpenGenerate(true)}
              disabled={!activeModuleId}
            >
              Generate Set via AI
            </Button>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              sx={{ px: 3, py: 1 }} 
              onClick={handleOpenCreate}
              disabled={!activeModuleId}
            >
              Add Question
            </Button>
          </Box>
        </Box>

        {/* Filters & Search */}
        <Card>
          {/* Module Tabs */}
          <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
            {modules.map(mod => (
              <Button
                key={mod.id} 
                onClick={() => setActiveModuleId(mod.id)}
                sx={{ 
                  px: 4, py: 2, 
                  minWidth: 'auto',
                  borderRadius: 0,
                  borderBottom: activeModuleId === mod.id ? '2px solid #f26522' : '2px solid transparent',
                  color: activeModuleId === mod.id ? 'primary.main' : 'text.secondary',
                  fontWeight: activeModuleId === mod.id ? 700 : 500,
                  textTransform: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.2s ease',
                  '&:hover': { color: '#f26522' }
                }}
              >
                {mod.name}
              </Button>
            ))}
          </Box>

          <Box sx={{ p: 2, px: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 3 }}>
            {/* Set Chips */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              {uniqueSets.map(setName => (
                <Button 
                  key={setName} 
                  onClick={() => setActiveSet(setName)}
                  sx={{ 
                    px: 2, py: 0.5,
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: activeSet === setName ? 'rgba(242,101,34,0.3)' : 'rgba(0,0,0,0.1)',
                    bgcolor: activeSet === setName ? 'rgba(242,101,34,0.1)' : 'transparent',
                    color: activeSet === setName ? 'primary.main' : 'text.secondary',
                    fontWeight: activeSet === setName ? 600 : 500,
                    textTransform: 'none',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s ease',
                    '&:hover': { bgcolor: activeSet === setName ? 'rgba(242,101,34,0.15)' : 'rgba(0,0,0,0.04)' }
                  }}
                >
                  {setName}
                </Button>
              ))}
              {activeSet !== 'All Sets' && activeSet !== 'Default Set' && (
                <Box sx={{ display: 'flex', ml: 1, gap: 0.5 }}>
                  <IconButton aria-label="action" size="small" onClick={() => { setRenameSetInput(activeSet); setOpenRenameSet(true); }} sx={{ color: '#f26522' }} title="Rename Set">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton aria-label="action" size="small" onClick={handleDeleteSet} sx={{ color: 'error.main' }} title="Delete Set">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>

            {/* Search Bar */}
            <Box sx={{ position: 'relative', width: { xs: '100%', md: 280 } }}>
              <SearchIcon sx={{ color: 'text.secondary', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 20, pointerEvents: 'none' }} />
              <InputBase 
                placeholder="Search questions..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: '100%', pl: 5, pr: 2, py: 1, fontSize: '0.875rem' }} 
              />
            </Box>
          </Box>
        </Card>

        {/* Data Table */}
        <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TableContainer sx={{ flexGrow: 1 }}>
            <Table stickyHeader sx={{ minWidth: 600 }} aria-label="question bank table">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.08)', width: 60, textTransform: 'uppercase', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.08)', textTransform: 'uppercase', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif' }}>Question Text</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.08)', textTransform: 'uppercase', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif' }}>Set Name</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 600, color: 'text.secondary', py: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.08)', textTransform: 'uppercase', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif' }}>Difficulty</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.08)', textTransform: 'uppercase', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', py: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.08)', textTransform: 'uppercase', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredQuestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8, borderBottom: 'none' }}>
                      <Typography sx={{ color: 'text.secondary', fontFamily: 'DM Sans, sans-serif' }}>No questions found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : paginatedQuestions.map((q, index) => (
                  <TableRow key={q.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'var(--ae-surface)' } }}>
                    <TableCell align="center" sx={{ py: 2, color: 'text.secondary', fontWeight: 500, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                      {page * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300, py: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: 'text.primary', fontSize: '0.875rem', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.text}</Typography>
                        {q.ideal_answer && (
                          <Tooltip title={<Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>{q.ideal_answer}</Typography>} arrow placement="top">
                            <Chip size="small" label="Answer" sx={{ height: 20, fontSize: '0.625rem', bgcolor: 'rgba(5, 150, 105, 0.1)', color: 'success.dark', fontWeight: 600, borderRadius: 1, cursor: 'help' }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                      <Box sx={{ display: 'inline-flex', px: 1, py: 0.5, borderRadius: 1, bgcolor: 'rgba(242, 101, 34, 0.1)', color: 'primary.main', fontSize: '0.625rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                        {q.set_name || 'Default Set'}
                      </Box>
                    </TableCell>
                    <TableCell align="left" sx={{ py: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 8, height: 8, borderRadius: '50%',
                          ...(q.difficulty === 'EASY' && { bgcolor: 'success.main' }),
                          ...(q.difficulty === 'MEDIUM' && { bgcolor: '#f59e0b' }),
                          ...(q.difficulty === 'HARD' && { bgcolor: '#ef4444' })
                        }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}>{q.difficulty === 'EASY' ? 'Easy' : q.difficulty === 'MEDIUM' ? 'Medium' : 'Hard'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                      <Switch inputProps={{ "aria-label": "toggle active" }} checked={q.is_active} onChange={() => handleToggle(q.id)} size="small" sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#f26522' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#f26522' } }} />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                      <IconButton aria-label="action" size="small" onClick={() => handleOpenEdit(q)} sx={{ color: 'text.secondary', '&:hover': { color: '#f26522' }, mr: 1 }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton aria-label="action" size="small" onClick={() => handleDelete(q.id)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ borderTop: '1px solid rgba(225,191,179,0.5)', bgcolor: '#eff4ff' }}>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredQuestions.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ color: 'text.secondary', fontFamily: 'DM Sans, sans-serif' }}
            />
          </Box>
        </Card>

      </Box>

    {/* Add Question Dialog */}    {/* Add Question Dialog */}    {/* Add Question Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 24px 64px rgba(0,0,0,0.1)' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', pb: 1, pt: 3 }}>{editMode ? 'Edit Question' : 'Add New Question'}</DialogTitle>
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
            <TextField 
              label="Ideal Answer / Key Points (Optional)" 
              multiline 
              rows={3} 
              fullWidth 
              value={newQuestion.ideal_answer || ''}
              onChange={(e) => setNewQuestion({ ...newQuestion, ideal_answer: e.target.value })}
              placeholder="- Key concept 1&#10;- Key concept 2"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Select Set</InputLabel>
                <Select
                  value={newQuestion.setNameSelection}
                  label="Select Set"
                  onChange={(e) => setNewQuestion({ ...newQuestion, setNameSelection: e.target.value })}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="+ Auto-Create New Set" sx={{ fontWeight: 'bold', color: 'primary.main' }}>+ Auto-Create New Set</MenuItem>
                  {existingSetsOnly.map(set => (
                    <MenuItem key={set} value={set}>{set}</MenuItem>
                  ))}
                  <MenuItem value="Default Set">Default Set</MenuItem>
                </Select>
              </FormControl>
              
              {newQuestion.setNameSelection === '+ Auto-Create New Set' && (
                <FormControl fullWidth>
                  <TextField
                    label="Auto-Generated Set Name"
                    value={nextAvailableSetName}
                    disabled
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </FormControl>
              )}
            </Box>

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
          <Button onClick={handleSaveQuestion} variant="contained" color="primary" disabled={!newQuestion.text.trim() || !newQuestion.setNameSelection} sx={{ fontWeight: 600, borderRadius: 2, px: 3, boxShadow: 'none' }}>
            {editMode ? 'Update Question' : 'Save Question'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate AI Set Dialog */}
      <Dialog open={openGenerate} onClose={() => !isGenerating && setOpenGenerate(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 24px 64px rgba(0,0,0,0.1)' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', pb: 1, pt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" /> Generate Set via AI
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The AI will read the uploaded Knowledge Documents for this module and generate a brand new set of questions.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField 
              label="Auto-Generated Set Name" 
              fullWidth 
              value={nextAvailableSetName}
              disabled
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField 
              label="Number of Questions" 
              type="number"
              fullWidth 
              value={generateConfig.count}
              onChange={(e) => setGenerateConfig({ ...generateConfig, count: parseInt(e.target.value) || 15 })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenGenerate(false)} color="inherit" disabled={isGenerating} sx={{ fontWeight: 600, borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleGenerateAISet} variant="contained" color="primary" disabled={isGenerating} sx={{ fontWeight: 600, borderRadius: 2, px: 3, boxShadow: 'none' }}>
            {isGenerating ? <CircularProgress size={24} color="inherit" /> : 'Generate Now'}
          </Button>
        </DialogActions>
      </Dialog>

      
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    
      <Dialog open={openRenameSet} onClose={() => setOpenRenameSet(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 24px 64px rgba(0,0,0,0.1)' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '1.25rem', pb: 1, pt: 3 }}>Rename Set</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField 
            label="New Set Name" 
            fullWidth 
            value={renameSetInput}
            onChange={(e) => setRenameSetInput(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenRenameSet(false)} color="inherit" sx={{ fontWeight: 600, borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleRenameSet} variant="contained" color="primary" disabled={!renameSetInput.trim() || renameSetInput.trim() === activeSet} sx={{ fontWeight: 600, borderRadius: 2, px: 3, boxShadow: 'none' }}>
            Rename
          </Button>
        </DialogActions>
      </Dialog>

    
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, type: '', id: null, name: '' })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 24px 64px rgba(0,0,0,0.1)' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '1.25rem', pb: 1, pt: 3, color: 'error.main' }}>Confirm Deletion</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
            {deleteConfirm.type === 'SET' 
              ? `Are you sure you want to delete the set "${deleteConfirm.name}"? This will attempt to delete all questions within it.` 
              : `Are you sure you want to delete this question?`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setDeleteConfirm({ open: false, type: '', id: null, name: '' })} color="inherit" sx={{ fontWeight: 600, borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" sx={{ fontWeight: 600, borderRadius: 2, px: 3, boxShadow: 'none' }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

    </Layout>
  );
}
