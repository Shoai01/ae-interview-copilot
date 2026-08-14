import { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, TextField, Button, 
  Select, MenuItem, Alert, CircularProgress, Stack, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Avatar, Switch, InputAdornment
} from '@mui/material';
import Layout from '../components/Layout';
import { adminService } from '../services/api';
import { useAuth } from '../store/AuthContext';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

export default function UserManagement() {
  const { user } = useAuth();
  
  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: user?.role === 'TRAINER' ? 'TRAINEE' : 'TRAINER',
    full_name: '',
    employee_id: '',
    module_id: ''
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const mods = await adminService.getModules();
        setModules(mods);
        if (mods.length > 0) {
          setFormData(prev => ({ ...prev, module_id: mods[0].id }));
        }
      } catch (err) {
        console.error("Failed to fetch modules:", err);
      }
      
      setLoadingUsers(true);
      try {
        const fetchedUsers = await adminService.getUsers();
        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        username: formData.username,
        password: formData.password,
        role: formData.role,
        full_name: formData.full_name || null,
        employee_id: formData.employee_id || null,
        module_id: formData.role === 'TRAINEE' ? parseInt(formData.module_id) : null
      };

      const createdUser = await adminService.createUser(payload);
      
      setUsers(prev => [...prev, createdUser]);
      setSuccessMsg(`Successfully created ${payload.role.toLowerCase()} account for ${payload.username}`);
      setFormData({
        username: '',
        password: '',
        role: user?.role === 'TRAINER' ? 'TRAINEE' : 'TRAINER',
        full_name: '',
        employee_id: '',
        module_id: modules.length > 0 ? modules[0].id : ''
      });
      setTimeout(() => setOpenDialog(false), 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  const inputSx = {
    fontFamily: 'DM Sans, sans-serif',
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'primary.main',
      borderWidth: 1,
      boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.1)'
    }
  };
  const selectSx = {
    fontFamily: 'DM Sans, sans-serif',
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'primary.main',
      borderWidth: 1,
      boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.1)'
    }
  };
  const labelSx = { display: 'block', mb: 1, ml: 0.5, fontWeight: 500, fontFamily: 'DM Sans, sans-serif' };

  // Generate avatar letters
  const getInitials = (name, username) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    if (username) return username.substring(0, 2).toUpperCase();
    return 'U';
  };

  const filteredUsers = users.filter(u => 
    (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.employee_id && u.employee_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 1200, mx: 'auto', width: '100%' }}>
        
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: 'Syne, sans-serif', mb: 0.5, letterSpacing: '-0.02em', fontSize: '32px' }}>
              Manage Users
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px' }}>
              View and manage system access for trainers and trainees.
            </Typography>
          </Box>
          <Box>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<PersonAddIcon />}
              onClick={() => { setOpenDialog(true); setSuccessMsg(''); setErrorMsg(''); }}
              sx={{ 
                px: 3, py: 1.2, borderRadius: 2, textTransform: 'none', 
                fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)', 
                '&:hover': { boxShadow: '0 6px 20px rgba(242, 101, 34, 0.5)' } 
              }}
            >
              Add User
            </Button>
          </Box>
        </Box>

        {/* Toolbar */}
        <Box sx={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          bgcolor: 'white', p: 2, borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0px 4px 20px rgba(0,0,0,0.02)'
        }}>
          <TextField 
            placeholder="Search by name, username, or ID..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 320, ...inputSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={2}>
            <Button 
              variant="outlined" 
              startIcon={<FilterListIcon sx={{ fontSize: 18 }}/>}
              sx={{ 
                borderColor: 'rgba(0,0,0,0.1)', color: 'text.primary', textTransform: 'none', 
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, borderRadius: 2,
                bgcolor: 'transparent', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.2)' }
              }}
            >
              Filter
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<DownloadIcon sx={{ fontSize: 18 }}/>}
              sx={{ 
                borderColor: 'rgba(0,0,0,0.1)', color: 'text.primary', textTransform: 'none', 
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, borderRadius: 2,
                bgcolor: 'transparent', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.2)' }
              }}
            >
              Export
            </Button>
          </Stack>
        </Box>

        {/* Users Table */}
        <Card sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0px 10px 40px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          {loadingUsers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.01)' }}>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', fontSize: 11, letterSpacing: '0.05em' }}>NAME</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', fontSize: 11, letterSpacing: '0.05em' }}>USERNAME</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', fontSize: 11, letterSpacing: '0.05em' }}>EMP ID</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', fontSize: 11, letterSpacing: '0.05em' }}>ROLE</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', fontSize: 11, letterSpacing: '0.05em' }}>STATUS</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', fontSize: 11, letterSpacing: '0.05em' }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ 
                          width: 36, height: 36, fontSize: 13, fontWeight: 700,
                          bgcolor: u.role === 'ADMIN' ? 'rgba(0,0,0,0.08)' : (u.role === 'TRAINER' ? 'rgba(0,154,222,0.1)' : 'rgba(242,101,34,0.1)'),
                          color: u.role === 'ADMIN' ? 'text.primary' : (u.role === 'TRAINER' ? 'secondary.main' : 'primary.main'),
                        }}>
                          {getInitials(u.full_name, u.username)}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                          {u.full_name || '—'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>{u.username}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>{u.employee_id || '—'}</TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={u.role} 
                        sx={{ 
                          bgcolor: u.role === 'ADMIN' ? 'rgba(0,0,0,0.08)' : (u.role === 'TRAINER' ? 'rgba(0,154,222,0.06)' : 'rgba(242,101,34,0.06)'),
                          color: u.role === 'ADMIN' ? 'text.primary' : (u.role === 'TRAINER' ? 'secondary.dark' : 'primary.dark'),
                          fontWeight: 600, borderRadius: 1, fontFamily: 'DM Sans, sans-serif', fontSize: 12
                        }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Switch defaultChecked size="small" color="primary" />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" sx={{ color: 'text.secondary' }}>
                        <MoreHorizIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>

      </Box>

      {/* Add User Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        PaperProps={{ sx: { borderRadius: 3, width: '100%', maxWidth: 540, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          <Box sx={{ p: 1, bgcolor: 'rgba(242, 101, 34, 0.1)', borderRadius: 2, display: 'flex', color: 'primary.main' }}>
            <PersonAddIcon fontSize="small" />
          </Box>
          Create New Account
        </DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{successMsg}</Alert>}
          {errorMsg && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{errorMsg}</Alert>}

          <form id="add-user-form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" sx={labelSx}>
                  Email / Username *
                </Typography>
                <TextField 
                  fullWidth 
                  required 
                  size="small"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="trainee@company.com"
                  sx={inputSx}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" sx={labelSx}>
                  Temporary Password *
                </Typography>
                <TextField 
                  fullWidth 
                  required 
                  size="small"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  type="password"
                  placeholder="••••••••"
                  sx={inputSx}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" sx={labelSx}>
                  Role *
                </Typography>
                <Select 
                  fullWidth 
                  size="small"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={!isAdmin} // Only Admins can change roles
                  sx={selectSx}
                >
                  {isAdmin && <MenuItem value="TRAINER">Trainer</MenuItem>}
                  <MenuItem value="TRAINEE">Trainee</MenuItem>
                </Select>
                {!isAdmin && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 11 }}>
                    You only have permission to create Trainee accounts.
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" sx={labelSx}>
                  Full Name
                </Typography>
                <TextField 
                  fullWidth 
                  size="small"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  sx={inputSx}
                />
              </Grid>

              {formData.role === 'TRAINEE' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>
                      Employee ID
                    </Typography>
                    <TextField 
                      fullWidth 
                      size="small"
                      name="employee_id"
                      value={formData.employee_id}
                      onChange={handleChange}
                      placeholder="EMP-001"
                      sx={inputSx}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={labelSx}>
                      Assigned Module *
                    </Typography>
                    <Select 
                      fullWidth 
                      size="small"
                      name="module_id"
                      value={formData.module_id}
                      onChange={handleChange}
                      required={formData.role === 'TRAINEE'}
                      sx={selectSx}
                    >
                      {modules.map(mod => (
                        <MenuItem key={mod.id} value={mod.id}>{mod.name}</MenuItem>
                      ))}
                    </Select>
                  </Grid>
                </>
              )}
            </Grid>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setOpenDialog(false)} 
            sx={{ color: 'text.secondary', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="add-user-form"
            variant="contained" 
            color="primary"
            disabled={loading}
            sx={{ px: 3, borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)', '&:hover': { boxShadow: '0 6px 20px rgba(242, 101, 34, 0.5)' } }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
