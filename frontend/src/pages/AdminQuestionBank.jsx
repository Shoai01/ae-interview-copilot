import { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Paper, InputBase, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Switch, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControl, Select, InputLabel, CircularProgress } from '@mui/material';
import Layout from '../components/Layout';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import MicIcon from '@mui/icons-material/Mic';
import ChatIcon from '@mui/icons-material/Chat';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SignalCellularAlt2BarIcon from '@mui/icons-material/SignalCellularAlt2Bar';
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

  // Upload State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleUpload = async () => {
    if (!uploadFile || !activeModuleId) return;
    setIsUploading(true);
    try {
      await adminService.uploadKnowledgeDocument(activeModuleId, uploadFile);
      alert('Knowledge base updated successfully!');
      setUploadOpen(false);
      setUploadFile(null);
    } catch (err) {
      console.error("Failed to upload document:", err);
      alert('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredQuestions = questions.filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pb: 2 }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em', color: 'text.primary' }}>Question Bank & Knowledge</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, fontFamily: 'DM Sans, sans-serif' }}>Manage AI assessment scenarios, textbook contexts, and evaluation criteria.</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" color="secondary" startIcon={<UploadFileIcon />} sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: 600 }} onClick={() => setUploadOpen(true)}>
              Upload Knowledge (PDF)
            </Button>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} sx={{ boxShadow: '0 4px 14px rgba(242, 101, 34, 0.4)', borderRadius: 2, px: 3, py: 1, fontWeight: 600, '&:hover': { boxShadow: '0 6px 20px rgba(242, 101, 34, 0.6)' } }} onClick={() => setOpen(true)}>
              Add Question
            </Button>
          </Box>
        </Box>

        {/* Module Tabs */}
        <Box sx={{ display: 'flex', gap: 1, borderBottom: '1px solid', borderColor: 'rgba(0,0,0,0.06)', pb: 2 }}>
          {modules.map(mod => (
            <Button 
              key={mod.id}
              onClick={() => setActiveModuleId(mod.id)}
              variant={activeModuleId === mod.id ? 'contained' : 'text'}
              disableElevation
              sx={{ 
                borderRadius: 8, 
                px: 2.5, 
                py: 0.5,
                textTransform: 'none',
                fontWeight: activeModuleId === mod.id ? 600 : 500,
                color: activeModuleId === mod.id ? 'white' : 'text.secondary',
                bgcolor: activeModuleId === mod.id ? 'primary.main' : 'transparent',
                '&:hover': { 
                  bgcolor: activeModuleId === mod.id ? 'primary.dark' : 'rgba(0,0,0,0.04)' 
                }
              }}
            >
              {mod.name}
            </Button>
          ))}
        </Box>

        {/* Search Bar */}
        <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', p: 0.5, border: '1px solid', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 2, maxWidth: 400, transition: 'all 0.2s ease', '&:focus-within': { borderColor: 'primary.main', boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.1)' } }}>
          <SearchIcon sx={{ color: 'text.secondary', ml: 1 }} />
          <InputBase 
            placeholder="Search questions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ ml: 1, flex: 1, fontSize: 15, fontFamily: 'DM Sans, sans-serif' }} 
          />
        </Paper>

        {/* Data Table */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: '#fafafa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, borderBottom: '1px solid rgba(0,0,0,0.08)', width: 60 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Question Text</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Difficulty</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 2, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', py: 2, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>No questions found.</Typography>
                  </TableCell>
                </TableRow>
              ) : filteredQuestions.map((q, index) => (
                <TableRow key={q.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, transition: 'background-color 0.2s ease', '&:hover': { bgcolor: 'rgba(0,154,222,0.02)' } }}>
                  <TableCell sx={{ py: 2, color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    {index + 1}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 2, color: 'text.primary', fontWeight: 500, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    {q.text}
                  </TableCell>
                  <TableCell sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: 'rgba(0,0,0,0.04)', px: 1.5, py: 0.5, borderRadius: 1.5 }}>
                      {q.question_type === 'VOICE' ? <MicIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> : <ChatIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                      <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5}>{q.question_type}</Typography>
                    </Box>
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
                <InputLabel>Type</InputLabel>
                <Select
                  value={newQuestion.question_type}
                  label="Type"
                  onChange={(e) => setNewQuestion({ ...newQuestion, question_type: e.target.value })}
                  sx={{ borderRadius: 2 }}
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
      {/* Upload Knowledge Dialog */}
      <Dialog open={uploadOpen} onClose={() => !isUploading && setUploadOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>Upload Knowledge Base</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload a PDF textbook or manual. The AI will chunk this document and use it as context to dynamically generate new viva questions for Trainees assigned to {modules.find(m => m.id === activeModuleId)?.name}.
          </Typography>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setUploadFile(e.target.files[0])}
            disabled={isUploading}
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setUploadOpen(false)} color="inherit" sx={{ fontWeight: 600 }} disabled={isUploading}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            color="secondary" 
            sx={{ fontWeight: 600, borderRadius: 2, px: 3 }}
            disabled={!uploadFile || isUploading}
          >
            {isUploading ? <CircularProgress size={24} color="inherit" /> : 'Process & Store'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
