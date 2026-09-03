import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Typography, Button, IconButton, InputBase, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Switch, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControl, Select, InputLabel, CircularProgress, Card, Tooltip, Chip, ToggleButton, ToggleButtonGroup, Divider, Stack } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import Layout from '@/components/Layout';
import toast from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SyncIcon from '@mui/icons-material/Sync';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import { adminService } from '@/services/api';
import { parseCsvLine } from '@/utils/csv';

const MAX_BULK_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB — this is a small bulk-question CSV, not a file store

export default function AdminQuestionBank() {
  const [modules, setModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [createMode, setCreateMode] = useState('single');
  const [bulkQuestionsText, setBulkQuestionsText] = useState('');
  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSet, setActiveSet] = useState('All Sets');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog State
  const [open, setOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', ideal_answer: '', difficulty: 'MEDIUM', setNameSelection: '' });
  const [openGenerate, setOpenGenerate] = useState(false);
  const [generateConfig, setGenerateConfig] = useState({ count: 15, setNameSelection: '+ Auto-Create New Set' });
  const [isGenerating, setIsGenerating] = useState(false);
  // Edit Question State
  const [editMode, setEditMode] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState(null);

  // Set Management State
  
  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', id: null, name: '' });

  const [openRenameSet, setOpenRenameSet] = useState(false);
  const [renameSetInput, setRenameSetInput] = useState('');
  
  const fileInputRef = useRef(null);

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
    setCreateMode('single');
    setBulkQuestionsText('');
    setOpen(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error("Please upload a .csv file.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_BULK_UPLOAD_BYTES) {
      toast.error("File is too large — please upload a CSV under 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setBulkQuestionsText(event.target.result);
    };
    reader.onerror = () => {
      toast.error("Failed to read the file.");
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Question,IdealAnswer,Difficulty\nWhat is a React Hook?,Functions that let you hook into React state and lifecycle features.,MEDIUM\nWhat is the DOM?,The Document Object Model is a programming interface for HTML and XML documents.,EASY";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_questions_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveBulkQuestions = async () => {
    try {
      if (!bulkQuestionsText.trim()) return;
      if (!newQuestion.setNameSelection) {
        toast.error("Please select a Set for these questions.");
        return;
      }
      
      const finalSetName = newQuestion.setNameSelection === '+ Auto-Create New Set' ? nextAvailableSetName : newQuestion.setNameSelection;
      
      const lines = bulkQuestionsText.trim().split('\n');
      const parsedQuestions = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Skip header if it exists (naive check)
        if (i === 0 && line.toLowerCase().includes('question') && line.toLowerCase().includes('difficulty')) {
          continue;
        }

        const parts = parseCsvLine(line);
        if (parts.length >= 1) {
          parsedQuestions.push({
            text: parts[0],
            ideal_answer: parts.length > 1 && parts[1] ? parts[1] : null,
            difficulty: parts.length > 2 && ['EASY', 'MEDIUM', 'HARD'].includes(parts[2].toUpperCase()) ? parts[2].toUpperCase() : 'MEDIUM',
            set_name: finalSetName
          });
        }
      }
      
      if (parsedQuestions.length === 0) {
        toast.error("No valid questions found in bulk input.");
        return;
      }
      
      await adminService.createQuestionsBulk({
        module_id: activeModuleId,
        questions: parsedQuestions
      });
      
      toast.success(`Successfully uploaded ${parsedQuestions.length} questions!`);
      setOpen(false);
      fetchQuestions(activeModuleId);
    } catch (err) {
      console.error("Failed to save bulk questions:", err);
      toast.error("Failed to save bulk questions. Make sure format is correct.");
    }
  };

  const handleSaveQuestion = async () => {
    try {
      if (!newQuestion.text.trim()) return;
      const finalSetName = newQuestion.setNameSelection === '+ Auto-Create New Set' ? nextAvailableSetName : newQuestion.setNameSelection;
      
      if (editMode) {
        await adminService.updateQuestion(editQuestionId, { ...newQuestion, set_name: finalSetName });
        toast.success("Question updated successfully!");
      } else {
        await adminService.createQuestion({ ...newQuestion, set_name: finalSetName, module_id: activeModuleId });
        toast.success("Question created successfully!");
      }
      setOpen(false);
      fetchQuestions(activeModuleId);
    } catch (err) {
      console.error("Failed to save question:", err);
      toast.error("Failed to save question.");
    }
  };

  const handleConfirmDelete = async () => {
    const { type, id, name } = deleteConfirm;
    setDeleteConfirm({ open: false, type: '', id: null, name: '' });
    
    if (type === 'SET') {
      try {
        await adminService.deleteSet(activeModuleId, name);
        toast.success(`Set "${name}" deleted. (If questions were in use, they were deactivated instead).`);
        if (activeSet === name) { setActiveSet('All Sets'); setPage(0); }
        fetchQuestions(activeModuleId);
      } catch (err) {
        console.error("Failed to delete set:", err);
        toast.error("Failed to delete set.");
      }
    } else if (type === 'QUESTION') {
      try {
        await adminService.deleteQuestion(id);
        setQuestions(prev => prev.filter(q => q.id !== id));
        toast.success("Question deleted.");
      } catch (err) {
        console.error("Failed to delete question:", err);
        toast.error(err.response?.data?.detail || "Failed to delete question. It might be in use.");
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
      toast.success(`Set renamed to "${renameSetInput.trim()}"`);
      setActiveSet(renameSetInput.trim());
      setOpenRenameSet(false);
      fetchQuestions(activeModuleId);
    } catch (err) {
      console.error("Failed to rename set:", err);
      toast.error("Failed to rename set.");
    }
  };

  const handleGenerateAISet = async () => {
    try {
      if (!generateConfig.setNameSelection) {
        toast.error("Please select a target set.");
        return;
      }
      setIsGenerating(true);
      const targetSetName = generateConfig.setNameSelection === '+ Auto-Create New Set' 
        ? nextAvailableSetName 
        : generateConfig.setNameSelection;

      await adminService.generateSetViaAI(activeModuleId, targetSetName, generateConfig.count);
      setOpenGenerate(false);
      toast.success(`Successfully generated ${generateConfig.count} questions for ${targetSetName}!`);
      fetchQuestions(activeModuleId);
    } catch (err) {
      console.error("Failed to generate set:", err);
      toast.error(err.response?.data?.detail || "Failed to generate AI set.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggle = async (questionId) => {
    try {
      await adminService.toggleQuestionStatus(questionId);
      // Applied only after the server confirms — the Switch stays put until
      // then, so a failure below simply leaves it as-is.
      setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, is_active: !q.is_active } : q));
    } catch (err) {
      console.error("Failed to toggle status:", err);
      toast.error(err.response?.data?.detail || "Failed to update question status.");
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

  const totalQuestionsCount = questions.length;
  const activeQuestionsCount = useMemo(() => questions.filter(q => q.is_active).length, [questions]);
  const setsCount = useMemo(() => uniqueSets.filter(s => s !== 'All Sets').length, [uniqueSets]);
  const easyCount = useMemo(() => questions.filter(q => q.difficulty === 'EASY').length, [questions]);
  const medCount = useMemo(() => questions.filter(q => q.difficulty === 'MEDIUM').length, [questions]);
  const hardCount = useMemo(() => questions.filter(q => q.difficulty === 'HARD').length, [questions]);

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSet = activeSet === 'All Sets' || (q.set_name || 'Default Set') === activeSet;
    return matchesSearch && matchesSet;
  });
  const paginatedQuestions = filteredQuestions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Layout
      breadcrumbs={
        activeSet !== 'All Sets'
          ? [
              { label: 'Dashboard', path: '/hr/dashboard' },
              { label: 'Question Bank', onClick: () => { setActiveSet('All Sets'); setPage(0); } },
              { label: activeSet },
            ]
          : undefined
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 }, width: '100%' }}>
        
        {/* Header & Actions */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0F172A', letterSpacing: '-0.02em' }}>
                Question Bank
              </Typography>
              <Tooltip title="Refresh question bank" arrow>
                <IconButton
                  aria-label="Refresh questions"
                  onClick={() => fetchQuestions(activeModuleId)}
                  size="small"
                  disabled={!activeModuleId || loading}
                  sx={{
                    color: 'primary.main',
                    bgcolor: 'rgba(242, 101, 34, 0.08)',
                    border: '1px solid rgba(242, 101, 34, 0.2)',
                    '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.16)' },
                  }}
                >
                  <SyncIcon sx={{ fontSize: 18, animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', mt: 0.5 }}>
              Manage syllabus modules, author assessment questions, and generate AI test sets.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button 
              variant="outlined" 
              startIcon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />} 
              sx={{
                px: 2.5,
                py: 1,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                textTransform: 'none',
                borderColor: 'rgba(242, 101, 34, 0.4)',
                color: '#F26522',
                bgcolor: 'rgba(242, 101, 34, 0.04)',
                '&:hover': {
                  borderColor: '#F26522',
                  bgcolor: 'rgba(242, 101, 34, 0.1)',
                }
              }} 
              onClick={() => setOpenGenerate(true)}
              disabled={!activeModuleId}
            >
              Generate Set via AI
            </Button>
            <Button 
              variant="contained" 
              startIcon={<AddIcon sx={{ fontSize: 18 }} />} 
              sx={{
                background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
                color: '#FFFFFF !important',
                px: 3,
                py: 1,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(242, 101, 34, 0.4)',
                },
              }} 
              onClick={handleOpenCreate}
              disabled={!activeModuleId}
            >
              Add Question
            </Button>
          </Box>
        </Box>

        {/* KPI Strip */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5 }}>
          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                Module Questions
              </Typography>
              <Typography variant="h4" sx={{ color: '#0F172A', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                {totalQuestionsCount}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(242, 101, 34, 0.1)', color: '#F26522', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QuizOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                Question Sets
              </Typography>
              <Typography variant="h4" sx={{ color: '#6366F1', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                {setsCount}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayersOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                Active Questions
              </Typography>
              <Typography variant="h4" sx={{ color: '#16A34A', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                {activeQuestionsCount}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                Difficulty Mix
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, mt: 1, alignItems: 'center' }}>
                <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: 1, bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#16A34A', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
                  {easyCount} Easy
                </Box>
                <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: 1, bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#D97706', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
                  {medCount} Med
                </Box>
                <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: 1, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#DC2626', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
                  {hardCount} Hard
                </Box>
              </Box>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TuneOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>
        </Box>

        {/* Module Tabs & Set Filters Card */}
        <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
          {/* Module Tabs */}
          <Box sx={{ display: 'flex', borderBottom: '1px solid #E2E8F0', overflowX: 'auto', bgcolor: '#F8FAFC', px: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
            {modules.map(mod => {
              const isActive = activeModuleId === mod.id;
              return (
                <Button
                  key={mod.id} 
                  onClick={() => setActiveModuleId(mod.id)}
                  sx={{ 
                    px: 3,
                    py: 1.75, 
                    minWidth: 'auto',
                    borderRadius: 0,
                    borderBottom: isActive ? '2.5px solid #F26522' : '2.5px solid transparent',
                    color: isActive ? '#F26522' : '#64748B',
                    fontWeight: isActive ? 700 : 500,
                    textTransform: 'none',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    '&:hover': { color: '#F26522', bgcolor: 'rgba(242, 101, 34, 0.04)' }
                  }}
                >
                  {mod.name}
                </Button>
              );
            })}
          </Box>

          {/* Set Filter Pills & Search */}
          <Box sx={{ p: 2.5, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2.5 }}>
            {/* Set Pills */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              {uniqueSets.map(setName => {
                const isSelected = activeSet === setName;
                return (
                  <Button 
                    key={setName}
                    onClick={() => { setActiveSet(setName); setPage(0); }}
                    sx={{ 
                      px: 2,
                      py: 0.6,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: isSelected ? '#F26522' : '#E2E8F0',
                      bgcolor: isSelected ? 'rgba(242, 101, 34, 0.08)' : '#F8FAFC',
                      color: isSelected ? '#F26522' : '#64748B',
                      fontWeight: isSelected ? 700 : 500,
                      textTransform: 'none',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.85rem',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: isSelected ? 'rgba(242, 101, 34, 0.14)' : '#F1F5F9' }
                    }}
                  >
                    {setName}
                  </Button>
                );
              })}
              {activeSet !== 'All Sets' && activeSet !== 'Default Set' && (
                <Box sx={{ display: 'flex', ml: 0.5, gap: 0.5 }}>
                  <Tooltip title="Rename Set" arrow>
                    <IconButton size="small" onClick={() => { setRenameSetInput(activeSet); setOpenRenameSet(true); }} sx={{ color: '#F26522', bgcolor: 'rgba(242, 101, 34, 0.08)', '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.18)' } }}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Set" arrow>
                    <IconButton size="small" onClick={handleDeleteSet} sx={{ color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.08)', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.18)' } }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>

            {/* Search Bar */}
            <Box sx={{ position: 'relative', width: { xs: '100%', md: 280 } }}>
              <SearchIcon sx={{ color: '#94A3B8', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, pointerEvents: 'none' }} />
              <InputBase 
                placeholder="Search questions in set..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                sx={{
                  width: '100%',
                  pl: 4.5,
                  pr: 2,
                  py: 0.75,
                  fontSize: '0.875rem',
                  fontFamily: 'DM Sans, sans-serif',
                  bgcolor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 2,
                  '&:focus-within': {
                    borderColor: 'primary.main',
                    bgcolor: '#FFFFFF',
                  },
                }} 
              />
            </Box>
          </Box>
        </Card>

        {/* Data Table */}
        <Card elevation={0} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
          <TableContainer sx={{ flexGrow: 1 }}>
            <Table stickyHeader sx={{ minWidth: 600 }} aria-label="question bank table">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', py: 1.75, borderBottom: '1px solid #E2E8F0' } }}>
                  <TableCell align="center" sx={{ width: 50 }}>#</TableCell>
                  <TableCell>Question Text</TableCell>
                  <TableCell>Set Name</TableCell>
                  <TableCell align="left">Difficulty</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredQuestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8, borderBottom: 'none' }}>
                      <Typography sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>No questions found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : paginatedQuestions.map((q, index) => (
                  <TableRow key={q.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: '#F8FAFC' } }}>
                    <TableCell align="center" sx={{ py: 2, color: '#94A3B8', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderBottom: '1px solid #F1F5F9' }}>
                      {page * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 380, py: 2, borderBottom: '1px solid #F1F5F9' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Typography sx={{ color: '#0F172A', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {q.text}
                        </Typography>
                        {q.ideal_answer && (
                          <Tooltip title={<Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif' }}>{q.ideal_answer}</Typography>} arrow placement="top">
                            <Chip size="small" label="Answer" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#16A34A', fontWeight: 700, borderRadius: 1, cursor: 'help', flexShrink: 0, mt: 0.2 }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2, borderBottom: '1px solid #F1F5F9' }}>
                      <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.35, borderRadius: 1, bgcolor: 'rgba(242, 101, 34, 0.08)', color: '#F26522', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', border: '1px solid rgba(242, 101, 34, 0.2)' }}>
                        {q.set_name || 'Default Set'}
                      </Box>
                    </TableCell>
                    <TableCell align="left" sx={{ py: 2, borderBottom: '1px solid #F1F5F9' }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 8, height: 8, borderRadius: '50%',
                          ...(q.difficulty === 'EASY' && { bgcolor: '#16A34A' }),
                          ...(q.difficulty === 'MEDIUM' && { bgcolor: '#D97706' }),
                          ...(q.difficulty === 'HARD' && { bgcolor: '#DC2626' })
                        }} />
                        <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                          {q.difficulty === 'EASY' ? 'Easy' : q.difficulty === 'MEDIUM' ? 'Medium' : 'Hard'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2, borderBottom: '1px solid #F1F5F9' }}>
                      <Switch 
                        inputProps={{ "aria-label": "toggle active" }} 
                        checked={q.is_active} 
                        onChange={() => handleToggle(q.id)} 
                        size="small" 
                        sx={{ 
                          '& .MuiSwitch-switchBase.Mui-checked': { color: '#F26522' }, 
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#F26522' } 
                        }} 
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2, borderBottom: '1px solid #F1F5F9' }}>
                      <Tooltip title="Edit Question" arrow>
                        <IconButton aria-label="edit question" size="small" onClick={() => handleOpenEdit(q)} sx={{ color: '#64748B', '&:hover': { color: '#F26522', bgcolor: 'rgba(242, 101, 34, 0.08)' }, mr: 0.5 }}>
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Question" arrow>
                        <IconButton aria-label="delete question" size="small" onClick={() => handleDelete(q.id)} sx={{ color: '#64748B', '&:hover': { color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.08)' } }}>
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredQuestions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              borderTop: '1px solid #E2E8F0',
              fontFamily: 'DM Sans, sans-serif',
              bgcolor: '#FFFFFF',
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.85rem',
                color: '#64748B',
              }
            }}
          />
        </Card>

      </Box>

      {/* Add / Edit Question Dialog */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        maxWidth="sm" 
        fullWidth 
        PaperProps={{ 
          sx: { 
            borderRadius: 3, 
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          } 
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '1.25rem', pb: 2, pt: 2.5, borderBottom: '1px solid #E2E8F0', bgcolor: '#FFFFFF', color: '#0F172A' }}>
          {editMode ? 'Edit Question' : 'Add New Question'}
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: '24px !important' }}>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            {!editMode && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                <ToggleButtonGroup
                  value={createMode}
                  exclusive
                  onChange={(e, val) => val && setCreateMode(val)}
                  aria-label="create mode"
                  size="small"
                  sx={{
                    bgcolor: '#F1F5F9',
                    p: 0.5,
                    borderRadius: 2,
                    '& .MuiToggleButton-root': {
                      border: 'none',
                      borderRadius: 1.5,
                      px: 3,
                      py: 0.75,
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      fontFamily: 'DM Sans, sans-serif',
                      textTransform: 'none',
                      color: '#64748B',
                      '&.Mui-selected': {
                        bgcolor: '#FFFFFF',
                        color: 'primary.main',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                      },
                    },
                  }}
                >
                  <ToggleButton value="single">Single Entry</ToggleButton>
                  <ToggleButton value="bulk">Bulk Batch</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="select-set-label">Select Set (Required)</InputLabel>
                <Select
                  labelId="select-set-label"
                  value={newQuestion.setNameSelection}
                  label="Select Set (Required)"
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

            {createMode === 'bulk' && !editMode ? (
              <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px dashed #CBD5E1' }}>
                <Typography variant="body2" sx={{ mb: 2, fontFamily: 'DM Sans, sans-serif', color: '#64748B', textAlign: 'center' }}>
                  Paste rows directly from Excel or upload a CSV file.<br/>
                  <strong style={{ color: '#0F172A' }}>Format:</strong> <code>Question Text, Ideal Answer, Difficulty (EASY/MEDIUM/HARD)</code>
                </Typography>
                
                <TextField
                  multiline
                  rows={6}
                  fullWidth
                  placeholder="What is a React Hook?, Functions that let you hook into state., MEDIUM&#10;What is the DOM?, The Document Object Model is a programming interface., EASY"
                  value={bulkQuestionsText}
                  onChange={(e) => setBulkQuestionsText(e.target.value)}
                  sx={{ mb: 2, bgcolor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: 2, fontFamily: 'monospace', fontSize: '0.85rem' } }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button variant="text" size="small" onClick={handleDownloadTemplate} sx={{ textTransform: 'none', fontWeight: 600, color: 'primary.main', fontFamily: 'DM Sans, sans-serif' }}>
                    Download CSV Template
                  </Button>
                  <Box>
                    <input
                      type="file"
                      accept=".csv"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    <Button 
                      variant="outlined" 
                      size="small"
                      startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ textTransform: 'none', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: 1.5, borderColor: '#E2E8F0', color: '#0F172A', '&:hover': { borderColor: 'primary.main' } }}
                    >
                      Upload CSV File
                    </Button>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                <TextField 
                  label="Question Text" 
                  multiline 
                  rows={3} 
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
                
                <FormControl fullWidth>
                  <InputLabel id="difficulty-select-label">Difficulty</InputLabel>
                  <Select
                    labelId="difficulty-select-label"
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
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setOpen(false)} sx={{ color: '#64748B', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            onClick={createMode === 'bulk' && !editMode ? handleSaveBulkQuestions : handleSaveQuestion} 
            variant="contained" 
            disabled={createMode === 'bulk' && !editMode ? !bulkQuestionsText.trim() : (!newQuestion.text.trim() || !newQuestion.setNameSelection)} 
            sx={{
              background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
              color: '#FFFFFF !important',
              fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif',
              borderRadius: 2,
              px: 3,
              py: 0.9,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(242, 101, 34, 0.4)',
              },
            }}
          >
            {createMode === 'bulk' && !editMode ? 'Upload Bulk Questions' : (editMode ? 'Update Question' : 'Save Question')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate AI Set Dialog */}
      <Dialog 
        open={openGenerate} 
        onClose={() => !isGenerating && setOpenGenerate(false)} 
        maxWidth="sm" 
        fullWidth 
        PaperProps={{ 
          sx: { 
            borderRadius: 3, 
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          } 
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '1.25rem', pb: 2, pt: 2.5, borderBottom: '1px solid #E2E8F0', bgcolor: '#FFFFFF', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 22 }} /> Generate Set via AI
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: '24px !important' }}>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 3, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
            The AI engine will read the uploaded Knowledge Base documents for this module, analyze topic scope, and author a balanced question set.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <FormControl fullWidth>
              <InputLabel>Target Set</InputLabel>
              <Select
                value={generateConfig.setNameSelection}
                label="Target Set"
                onChange={(e) => setGenerateConfig({ ...generateConfig, setNameSelection: e.target.value })}
                sx={{ borderRadius: 2 }}
                disabled={isGenerating}
              >
                <MenuItem value="+ Auto-Create New Set" sx={{ fontWeight: 'bold', color: 'primary.main' }}>+ Auto-Create New Set</MenuItem>
                {existingSetsOnly.map(set => (
                  <MenuItem key={set} value={set}>{set}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {generateConfig.setNameSelection === '+ Auto-Create New Set' && (
              <TextField 
                label="Auto-Generated Set Name" 
                fullWidth 
                value={nextAvailableSetName}
                disabled
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            )}
            
            <TextField 
              label="Number of Questions" 
              type="number"
              fullWidth 
              value={generateConfig.count}
              onChange={(e) => setGenerateConfig({ ...generateConfig, count: parseInt(e.target.value) || 15 })}
              disabled={isGenerating}
              inputProps={{ min: 1, max: 50 }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setOpenGenerate(false)} color="inherit" disabled={isGenerating} sx={{ color: '#64748B', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerateAISet} 
            variant="contained" 
            disabled={isGenerating} 
            sx={{
              background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
              color: '#FFFFFF !important',
              fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif',
              borderRadius: 2,
              px: 3,
              py: 0.9,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(242, 101, 34, 0.4)',
              },
            }}
          >
            {isGenerating ? <CircularProgress size={20} color="inherit" /> : 'Generate Now'}
          </Button>
        </DialogActions>
      </Dialog>
    
      {/* Rename Set Dialog */}
      <Dialog 
        open={openRenameSet} 
        onClose={() => setOpenRenameSet(false)} 
        maxWidth="xs" 
        fullWidth 
        PaperProps={{ 
          sx: { 
            borderRadius: 3, 
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          } 
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', pb: 2, pt: 2.5, borderBottom: '1px solid #E2E8F0', bgcolor: '#FFFFFF', color: '#0F172A' }}>
          Rename Question Set
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: '24px !important' }}>
          <TextField 
            label="New Set Name" 
            fullWidth 
            value={renameSetInput}
            onChange={(e) => setRenameSetInput(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setOpenRenameSet(false)} sx={{ color: '#64748B', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleRenameSet} 
            variant="contained" 
            disabled={!renameSetInput.trim() || renameSetInput.trim() === activeSet} 
            sx={{
              background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
              color: '#FFFFFF !important',
              fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif',
              borderRadius: 2,
              px: 3,
              py: 0.9,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)',
            }}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirm.open} 
        onClose={() => setDeleteConfirm({ open: false, type: '', id: null, name: '' })} 
        maxWidth="xs" 
        fullWidth 
        PaperProps={{ 
          sx: { 
            borderRadius: 3, 
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          } 
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', pb: 2, pt: 2.5, borderBottom: '1px solid #E2E8F0', bgcolor: '#FFFFFF', color: '#DC2626' }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: '24px !important' }}>
          <Typography variant="body2" sx={{ color: '#475569', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
            {deleteConfirm.type === 'SET' 
              ? `Are you sure you want to delete the set "${deleteConfirm.name}"? Active viva questions in this set will be deactivated.` 
              : `Are you sure you want to delete this question from the question bank?`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setDeleteConfirm({ open: false, type: '', id: null, name: '' })} sx={{ color: '#64748B', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" sx={{ fontWeight: 700, borderRadius: 2, px: 3, py: 0.9, textTransform: 'none', fontFamily: 'DM Sans, sans-serif' }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

    </Layout>
  );
}
