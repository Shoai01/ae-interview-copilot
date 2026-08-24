import { useEffect, useState, useRef, useMemo } from 'react';
import { Box, Typography, Button, MenuItem, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Stack, CircularProgress, IconButton, TablePagination, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Autocomplete, Card, ToggleButton, ToggleButtonGroup, List, ListItem, ListItemText, Divider } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import Layout from '@/components/Layout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import SyncIcon from '@mui/icons-material/Sync';
import { useNavigate } from 'react-router-dom';
import { vivaService, adminService } from '@/services/api';
import toast from 'react-hot-toast';

export default function TrainerSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Assign Modal State
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [assignMode, setAssignMode] = useState('single'); // 'single' or 'bulk'
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkResults, setBulkResults] = useState(null);
  const fileInputRef = useRef(null);
  const [trainees, setTrainees] = useState([]);
  const [modulesList, setModulesList] = useState([]);
  const [assignForm, setAssignForm] = useState({ traineeId: '', traineeIdentifier: '', traineeFullName: '', moduleId: '', durationMinutes: 15, questionCount: '' });
  const [assigning, setAssigning] = useState(false);

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

  const handleAssignSubmit = async () => {
    if (assignMode === 'single') {
      if (!assignForm.traineeIdentifier) {
        toast.error("Please provide a trainee username");
        return;
      }
      setAssigning(true);
      try {
        const result = await vivaService.assignSession(
          assignForm.traineeId,
          assignForm.traineeIdentifier,
          assignForm.traineeFullName,
          assignForm.moduleId,
          assignForm.durationMinutes,
          assignForm.questionCount
        );
        toast.success('Session assigned successfully! Email notification is being sent.');
        setOpenAssignModal(false);
        fetchSessions();
      } catch (err) {
        console.error('Failed to assign session:', err);
        toast.error('Failed to assign session. ' + (err.response?.data?.detail || err.message));
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
        const parts = line.split(',');
        if (parts.length >= 1) {
          const identifier = parts[0].trim();
          const fullName = parts.length > 1 ? parts.slice(1).join(',').trim() : '';
          
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
          trainees
        );
        toast.success(`Successfully assigned ${result.success_count} sessions. Email notifications are being sent.`);
        setBulkResults(result.results);
        setOpenAssignModal(false);
        fetchSessions();
      } catch (err) {
        console.error('Failed to assign bulk sessions:', err);
        toast.error('Failed to assign bulk sessions. ' + (err.response?.data?.detail || err.message));
      } finally {
        setAssigning(false);
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setBulkInputText(event.target.result);
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
    return matchModule && matchStatus;
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  
  const selectedModule = modulesList.find(m => m.id === assignForm.moduleId);
  const maxAvailable = selectedModule?.max_questions_per_set || null;
  const helperText = maxAvailable 
    ? `Max available in a single set: ${maxAvailable}. Leave empty to auto-calculate.`
    : `Leave empty to auto-calculate based on duration`;

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, width: '100%' }}>
        
        {/* Page Header & Filters */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h3" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'text.primary', mb: 1, letterSpacing: '-0.5px' }}>
                  Viva Sessions
                </Typography>
                <IconButton aria-label="action" onClick={fetchSessions} size="medium" disabled={loading} sx={{ color: 'primary.main', bgcolor: 'rgba(242,101,34,0.1)', '&:hover': { bgcolor: 'rgba(242,101,34,0.2)' } }}>
                  <SyncIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                </IconButton>
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
                Review and evaluate completed candidate interviews.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              onClick={() => setOpenAssignModal(true)}
              sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', boxShadow: 'none', textTransform: 'none' }}
            >
              Assign Session
            </Button>
            <Select size="small" value={filterModule} onChange={(e) => setFilterModule(e.target.value)} displayEmpty sx={{ minWidth: 180, bgcolor: '#ffffff', borderRadius: 2, fontFamily: 'DM Sans, sans-serif', '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#f26522', borderWidth: 1, boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.1)' } }}>
              <MenuItem value="">All Modules</MenuItem>
              {uniqueModules.map(mod => (
                <MenuItem key={mod} value={mod}>{mod}</MenuItem>
              ))}
            </Select>
            <Select size="small" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} displayEmpty sx={{ minWidth: 140, bgcolor: '#ffffff', borderRadius: 2, fontFamily: 'DM Sans, sans-serif', '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#f26522', borderWidth: 1, boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.1)' } }}>
              <MenuItem value="">All Statuses</MenuItem>
              {uniqueStatuses.map(status => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </Box>
        </Box>

        {/* Data Table */}
        <Card sx={{ minHeight: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Table sx={{ minWidth: 800 }} aria-label="sessions table">
                <TableHead>
                  <TableRow sx={{  }}>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', py: 2 }}>Trainee Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', py: 2 }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', py: 2 }}>Module</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', py: 2 }}>Result</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', py: 2 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', py: 2 }}>Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', py: 2 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No sessions found. Complete an interview to see it here!
                      </TableCell>
                    </TableRow>
                  ) : filteredSessions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                    <TableRow 
                      key={row.id} 
                      hover 
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.2s ease',
                        '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.04)' }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', fontFamily: 'DM Sans, sans-serif', borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>{row.trainee_name || 'Unknown'}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontFamily: 'DM Sans, sans-serif', borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>{row.username || 'N/A'}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Box sx={{ display: 'inline-flex', px: 1, py: 0.5, bgcolor: 'rgba(242, 101, 34, 0.08)', borderRadius: 1, fontSize: '12px', fontWeight: 600, color: '#f26522' }}>
                          {row.module_name}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        {row.trainer_decision ? (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {row.trainer_decision === 'PASS' && <CheckCircleIcon sx={{ fontSize: 18, color: 'success.dark' }} />}
                            {row.trainer_decision === 'HOLD' && <WarningIcon sx={{ fontSize: 18, color: '#d97706' }} />}
                            {row.trainer_decision === 'FAIL' && <CancelIcon sx={{ fontSize: 18, color: '#dc2626' }} />}
                            <Typography variant="body2" sx={{ fontWeight: 600, color: row.trainer_decision === 'PASS' ? 'success.dark' : row.trainer_decision === 'HOLD' ? '#d97706' : '#dc2626' }}>
                              {row.trainer_decision} (Trainer)
                            </Typography>
                          </Stack>
                        ) : row.ai_recommendation ? (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {row.ai_recommendation === 'PASS' && <CheckCircleIcon sx={{ fontSize: 18, color: 'success.dark' }} />}
                            {row.ai_recommendation === 'BORDERLINE' && <WarningIcon sx={{ fontSize: 18, color: '#d97706' }} />}
                            {row.ai_recommendation === 'FAIL' && <CancelIcon sx={{ fontSize: 18, color: '#dc2626' }} />}
                            <Typography variant="body2" sx={{ fontWeight: 500, color: row.ai_recommendation === 'PASS' ? 'success.dark' : row.ai_recommendation === 'BORDERLINE' ? '#d97706' : '#dc2626' }}>
                              {row.ai_recommendation} (AI)
                            </Typography>
                          </Stack>
                        ) : row.status === 'Pending Review' ? (
                          <Typography variant="body2" color="text.secondary">Evaluating...</Typography>
                        ) : (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Chip 
                          label={row.status} 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            height: 24, 
                            fontSize: '12px',
                            bgcolor: row.status === 'Reviewed' ? 'rgba(34,197,94,0.1)' : row.status === 'Expired' ? 'rgba(239,68,68,0.1)' : row.status === 'In Progress' ? 'rgba(242,101,34,0.1)' : row.status === 'Pending Review' ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.04)',
                            borderColor: row.status === 'Assigned' ? 'divider' : 'transparent',
                            color: row.status === 'Reviewed' ? '#16a34a' : row.status === 'Expired' ? '#dc2626' : row.status === 'In Progress' ? '#F26522' : row.status === 'Pending Review' ? '#d97706' : 'text.secondary'
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontFamily: 'DM Sans, sans-serif', borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>{row.date}</TableCell>
                      <TableCell align="right" sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Button 
                          variant="outlined" 
                          color="primary" 
                          size="small"
                          onClick={() => navigate(`/hr/review/${row.id}`)}
                          sx={{ 
                            borderRadius: 2, 
                            fontWeight: 600, 
                            textTransform: 'none',
                            '&:hover': { bgcolor: 'primary.main', color: 'white' }
                          }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
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
              sx={{ borderTop: '1px solid rgba(225,191,179,0.5)',  }}
            />
          )}
        </Card>

      </Box>

      {/* Assign Session Modal */}
      <Dialog open={openAssignModal} onClose={() => setOpenAssignModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 24px 64px rgba(0,0,0,0.1)' } }}>
        <DialogTitle sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, pb: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}>
          Assign New Session
        </DialogTitle>
        <DialogContent sx={{ mt: 2, p: 3 }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <ToggleButtonGroup
                color="primary"
                value={assignMode}
                exclusive
                onChange={(e, newMode) => { if (newMode) setAssignMode(newMode); }}
                aria-label="Assign Mode"
                size="small"
                sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}
              >
                <ToggleButton value="single" sx={{ px: 3, py: 0.5, fontWeight: 600, textTransform: 'none', fontFamily: 'DM Sans' }}>Single Trainee</ToggleButton>
                <ToggleButton value="bulk" sx={{ px: 3, py: 0.5, fontWeight: 600, textTransform: 'none', fontFamily: 'DM Sans' }}>Bulk Batch</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {assignMode === 'single' ? (
              <>
                <FormControl fullWidth>
                  <Autocomplete
                    freeSolo
                    options={trainees}
                    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.username} (${option.full_name || 'No name'})`}
                    onChange={(event, newValue) => {
                      if (typeof newValue === 'string') {
                        setAssignForm({ ...assignForm, traineeId: '', traineeIdentifier: newValue, traineeFullName: '' });
                      } else if (newValue && newValue.id) {
                        setAssignForm({ ...assignForm, traineeId: newValue.id, traineeIdentifier: newValue.username, traineeFullName: newValue.full_name || '' });
                      } else {
                        setAssignForm({ ...assignForm, traineeId: '', traineeIdentifier: '', traineeFullName: '' });
                      }
                    }}
                    onInputChange={(event, newInputValue) => {
                      if (event && event.type === 'change') {
                        setAssignForm({ ...assignForm, traineeId: '', traineeIdentifier: newInputValue, traineeFullName: '' });
                      } else {
                        setAssignForm({ ...assignForm, traineeId: '', traineeIdentifier: newInputValue });
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
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed rgba(0,0,0,0.12)' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'DM Sans', textAlign: 'center' }}>
                  Paste rows directly from Excel or upload a CSV file.<br/>
                  <strong>Format:</strong> <code>Username, Full Name</code>
                </Typography>
                
                <TextField
                  multiline
                  rows={6}
                  fullWidth
                  placeholder="aarav.sharma@gmail.com, Aarav Sharma\ndiya.patel@gmail.com, Diya Patel"
                  value={bulkInputText}
                  onChange={(e) => setBulkInputText(e.target.value)}
                  sx={{ mb: 2, bgcolor: '#fff' }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button variant="text" size="small" onClick={handleDownloadTemplate} sx={{ textTransform: 'none', fontWeight: 600 }}>
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
                      sx={{ textTransform: 'none', fontWeight: 600, borderColor: 'rgba(0,0,0,0.1)' }}
                    >
                      Upload CSV
                    </Button>
                  </Box>
                </Box>
              </Box>
            )}

            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0a1628' }}>Module Settings</Typography>
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
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setOpenAssignModal(false)} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAssignSubmit} 
            disabled={assigning}
            sx={{ fontWeight: 600, px: 3, borderRadius: 2 }}
          >
            {assigning ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Results Dialog */}
      <Dialog open={Boolean(bulkResults)} onClose={() => setBulkResults(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontFamily: 'Syne', fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '1px solid divider' }}>
          Bulk Assignment Results
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
            {bulkResults?.map((res, i) => (
              <Box key={i}>
                <ListItem sx={{ py: 1.5, px: 3 }}>
                  <ListItemText 
                    primary={<Typography sx={{ fontWeight: 600, fontSize: 14 }}>{res.identifier} {res.full_name ? `(${res.full_name})` : ''}</Typography>}
                    secondary={
                      res.error ? (
                        <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }}>Error: {res.error}</Typography>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'success.main', mt: 0.5 }}>
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
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button variant="contained" onClick={() => setBulkResults(null)} sx={{ borderRadius: 2, px: 3 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
