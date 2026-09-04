import { useEffect, useState, useRef, useMemo } from 'react';
import { Box, Typography, Button, MenuItem, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Stack, CircularProgress, IconButton, TablePagination, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Autocomplete, Card, ToggleButton, ToggleButtonGroup, List, ListItem, ListItemText, Divider, Avatar, Tooltip } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import Layout from '@/components/Layout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import { useNavigate, useLocation } from 'react-router-dom';
import { vivaService, adminService } from '@/services/api';
import { parseCsvLine } from '@/utils/csv';
import toast from 'react-hot-toast';

const MAX_BULK_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB — this is a small bulk-trainee CSV, not a file store

const DEFAULT_ASSIGN_FORM = { traineeId: '', traineeIdentifier: '', traineeFullName: '', moduleId: '', durationMinutes: 15, questionCount: '', setName: '' };

// Read once per mount, used by the three lazy useState initializers below —
// restoring via initial state (rather than a separate mount effect calling
// setState) avoids a render race where the very first run of the
// draft-persist effect would see pre-restore values and immediately wipe
// the just-restored draft back out of storage.
function getSavedAssignDraft() {
  try {
    const saved = sessionStorage.getItem('trainer_assign_form_draft');
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export default function TrainerSessions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  // A dashboard KPI card (e.g. "Passed") can deep-link here pre-filtered —
  // seed the filter state from navigation state so the table matches the
  // number the trainer just clicked.
  const [filterModule, setFilterModule] = useState(location.state?.filterModule || '');
  const [filterStatus, setFilterStatus] = useState(location.state?.filterStatus || '');
  const [filterResult, setFilterResult] = useState(location.state?.filterResult || '');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Assign Modal State
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [assignMode, setAssignMode] = useState(() => getSavedAssignDraft()?.assignMode || 'single'); // 'single' or 'bulk'
  const [bulkInputText, setBulkInputText] = useState(() => getSavedAssignDraft()?.bulkInputText || '');
  const [bulkResults, setBulkResults] = useState(null);
  const fileInputRef = useRef(null);
  const [trainees, setTrainees] = useState([]);
  const [modulesList, setModulesList] = useState([]);
  const [assignForm, setAssignForm] = useState(() => getSavedAssignDraft()?.assignForm || DEFAULT_ASSIGN_FORM);
  const [assigning, setAssigning] = useState(false);
  const [moduleSets, setModuleSets] = useState([]);

  const clearAssignDraft = () => {
    try {
      sessionStorage.removeItem('trainer_assign_form_draft');
    } catch (err) {
      // Ignore storage cleanup errors
    }
  };

  const resetAssignForm = () => {
    setAssignMode('single');
    setBulkInputText('');
    setAssignForm(DEFAULT_ASSIGN_FORM);
    setModuleSets([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    clearAssignDraft();
  };

  const openFreshAssignModal = () => {
    resetAssignForm();
    setOpenAssignModal(true);
  };

  const closeAssignModal = () => {
    setOpenAssignModal(false);
    resetAssignForm();
  };


  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await vivaService.getAllSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignData = async () => {
    try {
      const [usersData, modsData] = await Promise.all([
        adminService.getUsers(),
        adminService.getModules()
      ]);
      setTrainees(usersData.filter(u => u.role === 'TRAINEE'));
      setModulesList(modsData);
    } catch (e) {
      console.error("Failed to fetch data for assign modal:", e);
      toast.error("Could not load trainees or modules.");
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchAssignData();
  }, []);

  // Persist assignment draft to storage. Clearing the form back to empty
  // must also clear the stored draft — otherwise the stale pre-clear draft
  // silently reappears next time the modal opens.
  useEffect(() => {
    try {
      if (openAssignModal || bulkInputText || assignForm.moduleId) {
        sessionStorage.setItem('trainer_assign_form_draft', JSON.stringify({
          assignForm,
          assignMode,
          bulkInputText
        }));
      } else {
        sessionStorage.removeItem('trainer_assign_form_draft');
      }
    } catch {}
  }, [openAssignModal, assignForm, assignMode, bulkInputText]);

  useEffect(() => {
    if (assignForm.moduleId) {
      vivaService.getModuleSets(assignForm.moduleId)
        .then(sets => setModuleSets(sets || []))
        .catch(err => {
          console.error("Failed to fetch module sets:", err);
          setModuleSets([]);
        });
    } else {
      setModuleSets([]);
    }
  }, [assignForm.moduleId]);

  const handleAssignSubmit = async () => {
    if (!assignForm.moduleId) {
      toast.error("Please select a module before assigning");
      return;
    }

    if (assignMode === 'single') {
      if (!assignForm.traineeIdentifier) {
        toast.error("Please provide a trainee username");
        return;
      }
      setAssigning(true);
      try {
        await vivaService.assignSession(
          assignForm.traineeId,
          assignForm.traineeIdentifier,
          assignForm.traineeFullName,
          assignForm.moduleId,
          assignForm.durationMinutes,
          assignForm.questionCount,
          assignForm.setName
        );
        try {
          sessionStorage.removeItem('trainer_assign_form_draft');
        } catch (e) {}
        toast.success('Session assigned successfully! Email notification is being sent.');
        setOpenAssignModal(false);
        resetAssignForm();
        fetchSessions();
      } catch (err) {
        console.error('Failed to assign session:', err);
        const detail = err.response?.data?.detail;
        const errMsg = Array.isArray(detail) ? detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ') : (detail || err.message);
        toast.error('Failed to assign session. ' + errMsg);
      } finally {
        setAssigning(false);
      }
    } else {
      // Bulk Mode
      if (!bulkInputText.trim()) {
        toast.error("Please provide trainee details");
        return;
      }
      
      const trainees = [];
      const lines = bulkInputText.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = parseCsvLine(line);
        if (parts.length >= 1) {
          const identifier = parts[0];
          const fullName = parts.length > 1 ? parts.slice(1).join(', ') : '';
          
          // Skip header row if present
          if (identifier.toLowerCase() === 'username' || identifier.toLowerCase() === 'employee id') {
            continue;
          }
          
          if (identifier) {
            trainees.push({ trainee_identifier: identifier, trainee_full_name: fullName });
          }
        }
      }
      
      if (trainees.length === 0) {
        toast.error("Could not parse any valid trainees");
        return;
      }

      setAssigning(true);
      try {
        const result = await vivaService.assignSessionBulk(
          assignForm.moduleId,
          assignForm.durationMinutes,
          assignForm.questionCount,
          null, // Bulk batches use dynamic set assignment on exam start
          trainees
        );
        try {
          sessionStorage.removeItem('trainer_assign_form_draft');
        } catch (e) {}
        toast.success(`Successfully assigned ${result.success_count} sessions. Email notifications are being sent.`);
        setBulkResults(result.results);
        setOpenAssignModal(false);
        resetAssignForm();
        fetchSessions();
      } catch (err) {
        console.error('Failed to assign bulk sessions:', err);
        const detail = err.response?.data?.detail;
        const errMsg = Array.isArray(detail) ? detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ') : (detail || err.message);
        toast.error('Failed to assign bulk sessions. ' + errMsg);
      } finally {
        setAssigning(false);
      }
    }
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
      setBulkInputText(event.target.result);
    };
    reader.onerror = () => {
      toast.error("Failed to read the file.");
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Username,FullName\naarav.sharma@gmail.com,Aarav Sharma\ndiya.patel@gmail.com,Diya Patel\nrohan.mehta@gmail.com,Rohan Mehta\nananya.shah@gmail.com,Ananya Shah";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_assign_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const uniqueModules = [...new Set(sessions.map(s => s.module_name))].filter(Boolean);
  const uniqueStatuses = [...new Set(sessions.map(s => s.status))].filter(Boolean);

  const filteredSessions = sessions.filter(session => {
    const matchModule = filterModule === '' || session.module_name === filterModule;
    const matchStatus = filterStatus === '' || session.status === filterStatus;
    const effectiveResult = session.trainer_decision || session.ai_recommendation;
    const matchResult = filterResult === '' || effectiveResult === filterResult;
    return matchModule && matchStatus && matchResult;
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  
  const selectedModule = modulesList.find(m => m.id === assignForm.moduleId);
  let maxAvailable = selectedModule?.max_questions_per_set || null;
  let helperText = maxAvailable 
    ? `Max available in a single set: ${maxAvailable}. Leave empty to auto-calculate.`
    : `Leave empty to auto-calculate based on duration`;
    
  if (assignForm.setName) {
    const selectedSet = moduleSets.find(s => s.name === assignForm.setName);
    if (selectedSet) {
      maxAvailable = selectedSet.count;
      helperText = `Max available in selected set: ${maxAvailable}. Leave empty to auto-calculate.`;
    }
  }

  const totalCount = sessions.length;
  const inProgressCount = useMemo(() => sessions.filter(s => s.status === 'In Progress').length, [sessions]);
  const pendingCount = useMemo(() => sessions.filter(s => s.status === 'Pending Review').length, [sessions]);
  const passCount = useMemo(() => sessions.filter(s => (s.trainer_decision || s.ai_recommendation) === 'PASS').length, [sessions]);
  const hasActiveFilters = filterModule !== '' || filterStatus !== '' || filterResult !== '';
  const handleResetFilters = () => {
    setFilterModule('');
    setFilterStatus('');
    setFilterResult('');
    setPage(0);
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 }, width: '100%' }}>
        
        {/* Page Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Viva Sessions
              </Typography>
              <Tooltip title="Refresh sessions" arrow>
                <IconButton
                  aria-label="Refresh sessions"
                  onClick={fetchSessions}
                  size="small"
                  disabled={loading}
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
            <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
              Monitor live candidate examinations, assign new interviews, and review performance reports.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={openFreshAssignModal}
            sx={{
              background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
              color: '#FFFFFF !important',
              borderRadius: 2,
              px: 3,
              py: 1.1,
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)',
              alignSelf: { xs: 'flex-start', sm: 'auto' },
              '&:hover': {
                boxShadow: '0 6px 20px rgba(242, 101, 34, 0.4)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            Assign Session
          </Button>
        </Box>

        {/* KPI Metric Summary Strip — each card filters the table below it */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          <Card
            elevation={0}
            onClick={handleResetFilters}
            sx={{
              p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', cursor: 'pointer', transition: 'all 0.2s ease',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.08)', borderColor: '#CBD5E1' },
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em'}}>
                Total Sessions
              </Typography>
              <Typography variant="h4" sx={{ color: '#0F172A', fontWeight: 700, mt: 0.5 }}>
                {totalCount}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FactCheckOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          <Card
            elevation={0}
            onClick={() => { setFilterStatus('In Progress'); setPage(0); }}
            sx={{
              p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', cursor: 'pointer', transition: 'all 0.2s ease',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.08)', borderColor: '#F26522' },
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em'}}>
                In Progress
              </Typography>
              <Typography variant="h4" sx={{ color: '#F26522', fontWeight: 700, mt: 0.5 }}>
                {inProgressCount}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(242, 101, 34, 0.1)', color: '#F26522', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlayCircleOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          <Card
            elevation={0}
            onClick={() => { setFilterStatus('Pending Review'); setPage(0); }}
            sx={{
              p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', cursor: 'pointer', transition: 'all 0.2s ease',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.08)', borderColor: '#D97706' },
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em'}}>
                Pending Review
              </Typography>
              <Typography variant="h4" sx={{ color: '#D97706', fontWeight: 700, mt: 0.5 }}>
                {pendingCount}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HourglassEmptyIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          <Card
            elevation={0}
            onClick={() => { setFilterResult('PASS'); setPage(0); }}
            sx={{
              p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', cursor: 'pointer', transition: 'all 0.2s ease',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.08)', borderColor: '#16A34A' },
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em'}}>
                Certified (Pass)
              </Typography>
              <Typography variant="h4" sx={{ color: '#16A34A', fontWeight: 700, mt: 0.5 }}>
                {passCount}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VerifiedOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>
        </Box>

        {/* Filter Toolbar & Data Table Container */}
        <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2.5, overflow: 'hidden', bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
          
          {/* Filter Bar */}
          <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Select
                size="small"
                value={filterModule}
                onChange={(e) => { setFilterModule(e.target.value); setPage(0); }}
                displayEmpty
                sx={{
                  minWidth: 180,
                  bgcolor: '#FFFFFF',
                  borderRadius: 2,
                  fontSize: '0.85rem',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
                }}
              >
                <MenuItem value="">All Modules</MenuItem>
                {uniqueModules.map(mod => (
                  <MenuItem key={mod} value={mod}>{mod}</MenuItem>
                ))}
              </Select>

              <Select
                size="small"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
                displayEmpty
                sx={{
                  minWidth: 140,
                  bgcolor: '#FFFFFF',
                  borderRadius: 2,
                  fontSize: '0.85rem',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {uniqueStatuses.map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>

              <Select
                size="small"
                value={filterResult}
                onChange={(e) => { setFilterResult(e.target.value); setPage(0); }}
                displayEmpty
                sx={{
                  minWidth: 140,
                  bgcolor: '#FFFFFF',
                  borderRadius: 2,
                  fontSize: '0.85rem',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
                }}
              >
                <MenuItem value="">All Results</MenuItem>
                <MenuItem value="PASS">Pass</MenuItem>
                <MenuItem value="FAIL">Fail</MenuItem>
                <MenuItem value="BORDERLINE">Borderline</MenuItem>
                <MenuItem value="HOLD">Hold</MenuItem>
              </Select>

              {hasActiveFilters && (
                <Button
                  size="small"
                  onClick={handleResetFilters}
                  startIcon={<FilterListOffIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    color: '#64748B',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>

            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
              Showing {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
            </Typography>
          </Box>

          {/* Table Area */}
          <TableContainer>
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 350, gap: 1.5 }}>
                <CircularProgress sx={{ color: 'primary.main' }} />
                <Typography variant="body2" sx={{ color: '#64748B'}}>
                  Loading sessions...
                </Typography>
              </Box>
            ) : (
              <Table sx={{ minWidth: 800 }} aria-label="sessions table">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', py: 1.75 }}>Trainee</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', py: 1.75 }}>Identifier</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', py: 1.75 }}>Module</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', py: 1.75 }}>Result</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', py: 1.75 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', py: 1.75 }}>Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', py: 1.75 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 8, color: '#64748B'}}>
                        No viva sessions found matching the selected criteria.
                      </TableCell>
                    </TableRow>
                  ) : filteredSessions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                    <TableRow 
                      key={row.id} 
                      hover 
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.15s ease',
                        '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.03)' }
                      }}
                    >
                      <TableCell sx={{ py: 1.75, borderBottom: '1px solid #F1F5F9' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Avatar sx={{ width: 30, height: 30, bgcolor: 'rgba(242, 101, 34, 0.1)', color: '#F26522', fontSize: '0.75rem', fontWeight: 700}}>
                            {(row.trainee_name || 'U').charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.875rem' }}>
                            {row.trainee_name || 'Unknown'}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell sx={{ py: 1.75, borderBottom: '1px solid #F1F5F9' }}>
                        <Typography sx={{ color: '#64748B', fontSize: '0.825rem' }}>
                          {row.username || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 1.75, borderBottom: '1px solid #F1F5F9' }}>
                        <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.4, bgcolor: 'rgba(242, 101, 34, 0.08)', border: '1px solid rgba(242, 101, 34, 0.2)', borderRadius: 1.5, fontSize: '0.775rem', fontWeight: 600, color: '#F26522'}}>
                          {row.module_name}
                        </Box>
                      </TableCell>

                      <TableCell sx={{ py: 1.75, borderBottom: '1px solid #F1F5F9' }}>
                        {row.trainer_decision ? (
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            {row.trainer_decision === 'PASS' && <CheckCircleIcon sx={{ fontSize: 16, color: '#16A34A' }} />}
                            {row.trainer_decision === 'HOLD' && <WarningIcon sx={{ fontSize: 16, color: '#D97706' }} />}
                            {row.trainer_decision === 'FAIL' && <CancelIcon sx={{ fontSize: 16, color: '#DC2626' }} />}
                            <Typography sx={{ fontSize: '0.825rem', fontWeight: 700, color: row.trainer_decision === 'PASS' ? '#16A34A' : row.trainer_decision === 'HOLD' ? '#D97706' : '#DC2626' }}>
                              {row.trainer_decision} (Trainer)
                            </Typography>
                          </Stack>
                        ) : row.ai_recommendation ? (
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            {row.ai_recommendation === 'PASS' && <CheckCircleIcon sx={{ fontSize: 16, color: '#16A34A' }} />}
                            {row.ai_recommendation === 'BORDERLINE' && <WarningIcon sx={{ fontSize: 16, color: '#D97706' }} />}
                            {row.ai_recommendation === 'FAIL' && <CancelIcon sx={{ fontSize: 16, color: '#DC2626' }} />}
                            <Typography sx={{ fontSize: '0.825rem', fontWeight: 600, color: row.ai_recommendation === 'PASS' ? '#16A34A' : row.ai_recommendation === 'BORDERLINE' ? '#D97706' : '#DC2626' }}>
                              {row.ai_recommendation} (AI)
                            </Typography>
                          </Stack>
                        ) : row.status === 'Pending Review' ? (
                          <Typography sx={{ fontSize: '0.825rem', color: '#64748B', fontStyle: 'italic' }}>
                            Evaluating...
                          </Typography>
                        ) : (
                          <Typography sx={{ color: '#CBD5E1', fontSize: '0.825rem' }}>—</Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ py: 1.75, borderBottom: '1px solid #F1F5F9' }}>
                        <Chip 
                          label={row.status} 
                          size="small" 
                          sx={{ 
                            height: 24, 
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            bgcolor: row.status === 'Reviewed' ? 'rgba(34, 197, 94, 0.1)' : row.status === 'Expired' ? 'rgba(239, 68, 68, 0.1)' : row.status === 'In Progress' ? 'rgba(242, 101, 34, 0.1)' : row.status === 'Pending Review' ? 'rgba(245, 158, 11, 0.1)' : '#F1F5F9',
                            color: row.status === 'Reviewed' ? '#16A34A' : row.status === 'Expired' ? '#DC2626' : row.status === 'In Progress' ? '#F26522' : row.status === 'Pending Review' ? '#D97706' : '#64748B',
                            border: '1px solid',
                            borderColor: row.status === 'Reviewed' ? 'rgba(34, 197, 94, 0.25)' : row.status === 'Expired' ? 'rgba(239, 68, 68, 0.25)' : row.status === 'In Progress' ? 'rgba(242, 101, 34, 0.25)' : row.status === 'Pending Review' ? 'rgba(245, 158, 11, 0.25)' : '#E2E8F0',
                            borderRadius: 1.5,
                          }} 
                        />
                      </TableCell>

                      <TableCell sx={{ py: 1.75, color: '#64748B', fontSize: '0.825rem', borderBottom: '1px solid #F1F5F9' }}>
                        {row.date}
                      </TableCell>

                      <TableCell align="right" sx={{ py: 1.75, borderBottom: '1px solid #F1F5F9' }}>
                        <Button 
                          variant="outlined" 
                          size="small"
                          onClick={() => navigate(`/hr/review/${row.id}`)}
                          sx={{ 
                            borderRadius: 1.5, 
                            fontWeight: 600, 
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            borderColor: '#CBD5E1',
                            color: '#0F172A',
                            px: 1.75,
                            py: 0.4,
                            '&:hover': {
                              borderColor: 'primary.main',
                              bgcolor: 'rgba(242, 101, 34, 0.06)',
                              color: 'primary.main',
                            },
                          }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
          
          {!loading && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredSessions.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                borderTop: '1px solid #E2E8F0',
                bgcolor: '#FFFFFF',
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontSize: '0.85rem',
                  color: '#64748B',
                }
              }}
            />
          )}
        </Card>

      </Box>

      {/* Assign Session Modal */}
      <Dialog
        open={openAssignModal}
        onClose={closeAssignModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 2, borderBottom: '1px solid #E2E8F0', bgcolor: '#FFFFFF', color: '#0F172A', fontSize: '1.2rem' }}>
          Assign New Viva Session
        </DialogTitle>
        <DialogContent sx={{ mt: 2, p: 3 }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <ToggleButtonGroup
                value={assignMode}
                exclusive
                onChange={(e, newMode) => { if (newMode) setAssignMode(newMode); }}
                aria-label="Assign Mode"
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
                    textTransform: 'none',
                    color: '#64748B',
                    '&.Mui-selected': {
                      bgcolor: '#FFFFFF',
                      color: 'primary.main',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                      fontWeight: 700,
                    },
                  },
                }}
              >
                <ToggleButton value="single">Single Trainee</ToggleButton>
                <ToggleButton value="bulk">Bulk Batch</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {assignMode === 'single' ? (
              <>
                <FormControl fullWidth>
                  <Autocomplete
                    freeSolo
                    value={trainees.find(t => t.id === assignForm.traineeId) || null}
                    inputValue={assignForm.traineeIdentifier}
                    options={trainees}
                    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.username} (${option.full_name || 'No name'})`}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(event, newValue) => {
                      if (typeof newValue === 'string') {
                        setAssignForm(prev => ({ ...prev, traineeId: '', traineeIdentifier: newValue, traineeFullName: '' }));
                      } else if (newValue && newValue.id) {
                        setAssignForm(prev => ({ ...prev, traineeId: newValue.id, traineeIdentifier: newValue.username, traineeFullName: newValue.full_name || '' }));
                      } else {
                        setAssignForm(prev => ({ ...prev, traineeId: '', traineeIdentifier: '', traineeFullName: '' }));
                      }
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason === 'input') {
                        setAssignForm(prev => ({ ...prev, traineeId: '', traineeIdentifier: newInputValue, traineeFullName: '' }));
                      } else if (reason === 'clear') {
                        setAssignForm(prev => ({ ...prev, traineeId: '', traineeIdentifier: '', traineeFullName: '' }));
                      }
                    }}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Username" 
                        helperText="Select an existing trainee or type a new username to auto-create."
                      />
                    )}
                  />
                </FormControl>
                
                <FormControl fullWidth>
                  <TextField
                    label="Full Name"
                    value={assignForm.traineeFullName}
                    onChange={(e) => setAssignForm({ ...assignForm, traineeFullName: e.target.value })}
                    helperText="Auto-filled for existing users. Type manually if creating a new user."
                  />
                </FormControl>
              </>
            ) : (
              <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px dashed #CBD5E1' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                  Paste rows directly from Excel or upload a CSV file.<br/>
                  <strong>Format:</strong> <code>Username, Full Name</code>
                </Typography>
                
                <TextField
                  multiline
                  rows={6}
                  fullWidth
                  placeholder={"aarav.sharma@gmail.com, Aarav Sharma\ndiya.patel@gmail.com, Diya Patel"}
                  value={bulkInputText}
                  onChange={(e) => setBulkInputText(e.target.value)}
                  sx={{ mb: 2, bgcolor: '#FFFFFF' }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button variant="text" size="small" onClick={handleDownloadTemplate} sx={{ textTransform: 'none', fontWeight: 600}}>
                    Download Template
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
                      startIcon={<FileUploadIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#CBD5E1', color: '#0F172A' }}
                    >
                      Upload CSV
                    </Button>
                  </Box>
                </Box>
              </Box>
            )}

            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A'}}>Module Settings</Typography>
            <FormControl fullWidth>
              <InputLabel>Module</InputLabel>
              <Select
                label="Module"
                value={assignForm.moduleId}
                onChange={(e) => setAssignForm({ ...assignForm, moduleId: e.target.value })}
              >
                {modulesList.map(m => (
                  <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {assignMode === 'single' ? (
              <FormControl fullWidth disabled={!assignForm.moduleId}>
                <InputLabel>Question Set (Optional)</InputLabel>
                <Select
                  label="Question Set (Optional)"
                  value={assignForm.setName || ''}
                  onChange={(e) => setAssignForm({ ...assignForm, setName: e.target.value })}
                >
                  <MenuItem value=""><em>Random Set (Default)</em></MenuItem>
                  {moduleSets.map(set => (
                    <MenuItem key={set.name} value={set.name}>{set.name} ({set.count} Qs)</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Box sx={{ p: 2, bgcolor: 'rgba(242, 101, 34, 0.04)', border: '1px solid rgba(242, 101, 34, 0.2)', borderRadius: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'primary.main', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, mt: 0.2 }}>
                    i
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.25 }}>
                      Dynamic Question Set Allocation
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', lineHeight: 1.5, display: 'block' }}>
                      For bulk batches, question sets are automatically distributed at random when each candidate starts their exam to ensure question variety across the cohort.
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            )}
            
            <TextField 
              label="Duration (minutes)" 
              type="number" 
              fullWidth 
              value={assignForm.durationMinutes}
              onChange={(e) => setAssignForm({ ...assignForm, durationMinutes: parseInt(e.target.value) || 15 })}
              inputProps={{ min: 5, max: 120 }}
            />
            <TextField 
              label="Question Count (Optional)" 
              type="number" 
              fullWidth 
              value={assignForm.questionCount}
              onChange={(e) => {
                let val = parseInt(e.target.value);
                if (maxAvailable && val > maxAvailable) val = maxAvailable;
                setAssignForm({ ...assignForm, questionCount: val || e.target.value });
              }}
              inputProps={{ min: 1, max: maxAvailable }}
              placeholder="e.g. 5"
              helperText={helperText}
            />

          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={closeAssignModal} sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAssignSubmit} 
            disabled={assigning}
            sx={{
              background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
              color: '#FFFFFF !important',
              fontWeight: 700,
              px: 3.5,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(242, 101, 34, 0.4)',
              },
            }}
          >
            {assigning ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Results Dialog */}
      <Dialog open={Boolean(bulkResults)} onClose={() => setBulkResults(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, border: '1px solid #E2E8F0' } }}>
        <DialogTitle sx={{ fontWeight: 700, bgcolor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', color: '#0F172A' }}>
          Bulk Assignment Results
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
            {bulkResults?.map((res, i) => (
              <Box key={i}>
                <ListItem sx={{ py: 1.5, px: 3 }}>
                  <ListItemText 
                    primary={<Typography sx={{ fontWeight: 600, fontSize: 14}}>{res.identifier} {res.full_name ? `(${res.full_name})` : ''}</Typography>}
                    secondary={
                      res.error ? (
                        <Typography variant="body2" color="error.main" sx={{ mt: 0.5}}>Error: {res.error}</Typography>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'success.main', mt: 0.5}}>
                          Assigned successfully!
                        </Typography>
                      )
                    }
                  />
                </ListItem>
                {i < bulkResults.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button variant="contained" onClick={() => setBulkResults(null)} sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600, bgcolor: '#0F172A', '&:hover': { bgcolor: '#1E293B' } }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
