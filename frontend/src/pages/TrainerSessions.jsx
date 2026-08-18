import { useEffect, useState } from 'react';
import { Box, Typography, Button, MenuItem, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Stack, CircularProgress, IconButton, TablePagination, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Autocomplete } from '@mui/material';
import Layout from '@/components/Layout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
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
    if ((!assignForm.traineeId && !assignForm.traineeIdentifier) || !assignForm.moduleId || !assignForm.durationMinutes) {
      toast.error("Please fill all fields");
      return;
    }
    setAssigning(true);
    try {
      const payload = {
        trainee_id: assignForm.traineeId || null,
        trainee_identifier: assignForm.traineeIdentifier || null,
        trainee_full_name: assignForm.traineeFullName || null,
        module_id: assignForm.moduleId,
        duration_minutes: assignForm.durationMinutes
      };
      
      const res = await vivaService.assignSession(
        payload.trainee_id,
        payload.trainee_identifier,
        payload.trainee_full_name,
        payload.module_id,
        payload.duration_minutes,
        assignForm.questionCount
      );
      
      if (res.new_user_password) {
        toast.success(`Account created! Temp password: ${res.new_user_password}`, { duration: 10000 });
      } else {
        toast.success("Session assigned successfully!");
      }
      
      setOpenAssignModal(false);
      setAssignForm({ traineeId: '', traineeIdentifier: '', traineeFullName: '', moduleId: '', durationMinutes: 15 });
      fetchSessions();
      fetchAssignData(); // refresh trainees list
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to assign session");
    } finally {
      setAssigning(false);
    }
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 'calc(100vh - 120px)', bgcolor: '#f8f9ff', p: { xs: 2, md: 4 } }}>
        
        {/* Page Header & Filters */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0d1c2e', mb: 1 }}>
                  Viva Sessions
                </Typography>
                <IconButton onClick={fetchSessions} size="medium" disabled={loading} sx={{ color: 'primary.main', bgcolor: 'rgba(242,101,34,0.1)', '&:hover': { bgcolor: 'rgba(242,101,34,0.2)' } }}>
                  <SyncIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                </IconButton>
              </Box>
              <Typography variant="body1" sx={{ fontFamily: 'DM Sans, sans-serif', color: '#535f74' }}>
                Review and evaluate completed candidate interviews.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              onClick={() => setOpenAssignModal(true)}
              sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: 600, bgcolor: '#f26522', color: '#fff', fontFamily: 'DM Sans, sans-serif', '&:hover': { bgcolor: '#d9581b' }, boxShadow: 'none', textTransform: 'none' }}
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
        <Paper elevation={0} sx={{ bgcolor: '#ffffff', borderRadius: 3, border: '1px solid rgba(225,191,179,0.5)', overflow: 'hidden', minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Table sx={{ minWidth: 800 }} aria-label="sessions table">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#fafbfd' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#535f74', borderBottom: '1px solid rgba(225,191,179,0.5)', py: 2 }}>Trainee Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#535f74', borderBottom: '1px solid rgba(225,191,179,0.5)', py: 2 }}>Employee ID</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#535f74', borderBottom: '1px solid rgba(225,191,179,0.5)', py: 2 }}>Module</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#535f74', borderBottom: '1px solid rgba(225,191,179,0.5)', py: 2 }}>AI Rec.</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#535f74', borderBottom: '1px solid rgba(225,191,179,0.5)', py: 2 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#535f74', borderBottom: '1px solid rgba(225,191,179,0.5)', py: 2 }}>Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#535f74', borderBottom: '1px solid rgba(225,191,179,0.5)', py: 2 }}>Action</TableCell>
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
                      <TableCell sx={{ fontWeight: 600, color: '#0d1c2e', fontFamily: 'DM Sans, sans-serif', borderBottom: '1px solid rgba(225,191,179,0.3)' }}>{row.trainee_name || 'Unknown'}</TableCell>
                      <TableCell sx={{ color: '#535f74', fontFamily: 'DM Sans, sans-serif', borderBottom: '1px solid rgba(225,191,179,0.3)' }}>{row.employee_id || 'N/A'}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(225,191,179,0.3)' }}>
                        <Box sx={{ display: 'inline-flex', px: 1, py: 0.5, bgcolor: 'rgba(242, 101, 34, 0.08)', borderRadius: 1, fontSize: '12px', fontWeight: 600, color: '#f26522' }}>
                          {row.module_name}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(225,191,179,0.3)' }}>
                        {row.ai_recommendation ? (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {row.ai_recommendation === 'PASS' && <CheckCircleIcon sx={{ fontSize: 18, color: '#059669' }} />}
                            {row.ai_recommendation === 'BORDERLINE' && <WarningIcon sx={{ fontSize: 18, color: '#d97706' }} />}
                            {row.ai_recommendation === 'FAIL' && <CancelIcon sx={{ fontSize: 18, color: '#dc2626' }} />}
                            <Typography variant="body2" sx={{ fontWeight: 500, color: row.ai_recommendation === 'PASS' ? '#059669' : row.ai_recommendation === 'BORDERLINE' ? '#d97706' : '#dc2626' }}>
                              {row.ai_recommendation}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">Evaluating...</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(225,191,179,0.3)' }}>
                        <Chip 
                          label={row.status} 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            height: 24, 
                            fontSize: '12px',
                            bgcolor: row.status === 'Reviewed' ? 'rgba(0,0,0,0.04)' : row.status === 'Expired' ? 'rgba(220,38,38,0.1)' : 'transparent',
                            borderColor: row.status === 'Reviewed' || row.status === 'Expired' ? 'transparent' : 'divider',
                            color: row.status === 'Expired' ? '#dc2626' : 'text.secondary'
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#535f74', fontFamily: 'DM Sans, sans-serif', borderBottom: '1px solid rgba(225,191,179,0.3)' }}>{row.date}</TableCell>
                      <TableCell align="right" sx={{ borderBottom: '1px solid rgba(225,191,179,0.3)' }}>
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
              sx={{ borderTop: '1px solid rgba(225,191,179,0.5)', bgcolor: '#fafbfd' }}
            />
          )}
        </Paper>

      </Box>

      {/* Assign Session Modal */}
      <Dialog open={openAssignModal} onClose={() => setOpenAssignModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, pb: 1 }}>Assign New Viva Session</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <Autocomplete
                freeSolo
                options={trainees}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return `${option.username} (${option.full_name || 'N/A'})`;
                }}
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
                  if (event && event.type === 'change') { // only reset full name if typing manually
                    setAssignForm({ ...assignForm, traineeId: '', traineeIdentifier: newInputValue, traineeFullName: '' });
                  } else {
                    setAssignForm({ ...assignForm, traineeId: '', traineeIdentifier: newInputValue });
                  }
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Trainee Username" 
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
    </Layout>
  );
}
