import { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, TextField, Button, 
  Select, MenuItem, Alert, CircularProgress, Stack, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Avatar, Switch, InputAdornment, TableContainer
} from '@mui/material';
import Layout from '@/components/Layout';
import { adminService } from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';

export default function UserManagement() {
  const { user } = useAuth();
  
    const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    role: '',
    password: ''
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: user?.role === 'TRAINER' ? 'TRAINEE' : 'TRAINER',
    full_name: '',});

  const fetchUsersData = async () => {
    
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

  useEffect(() => {
    fetchUsersData();
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
        full_name: formData.full_name || null,};

      const createdUser = await adminService.createUser(payload);
      
      setUsers(prev => [...prev, createdUser]);
      setSuccessMsg(`Successfully created ${payload.role.toLowerCase()} account for ${payload.username}`);
      setFormData({
        username: '',
        password: '',
        role: user?.role === 'TRAINER' ? 'TRAINEE' : 'TRAINER',
        full_name: '',});
      setTimeout(() => setOpenDialog(false), 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setEditFormData({
      full_name: u.full_name || '',
      role: u.role,
      password: ''
    });
    setOpenEditDialog(true);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        full_name: editFormData.full_name || null,
        role: editFormData.role
      };
      if (editFormData.password) {
        payload.password = editFormData.password;
      }
      
      const updatedUser = await adminService.updateUser(selectedUser.id, payload);
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
      setSuccessMsg(`Successfully updated user ${selectedUser.username}`);
      setTimeout(() => setOpenEditDialog(false), 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update user.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!selectedUser) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await adminService.deleteUser(selectedUser.id);
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      setOpenDeleteDialog(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to delete user.');
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
    (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, width: '100%' }}>
        
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'text.primary', mb: 1, letterSpacing: '-0.5px' }}>
                Manage Users
              </Typography>
              <IconButton aria-label="action" onClick={fetchUsersData} size="medium" disabled={loadingUsers} >
                <SyncIcon sx={{ animation: loadingUsers ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
              </IconButton>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
              View and manage system access for trainers and trainees.
            </Typography>
          </Box>
          <Box>
            <Button 
              variant="contained" 
              startIcon={<PersonAddIcon />}
              onClick={() => { setOpenDialog(true); setSuccessMsg(''); setErrorMsg(''); }}
              sx={{ px: 3, py: 1 }}
            >
              Add User
            </Button>
          </Box>
        </Box>

        {/* Toolbar */}
        <Card sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
          }}>
          <TextField 
            placeholder="Search by name, username, or ID..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 320 }, ...inputSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
          </Box>

        {/* Users Table */}
        <TableContainer>
          {loadingUsers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'transparent' }}>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', fontSize: 11, letterSpacing: '0.05em' }}>NAME</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', fontSize: 11, letterSpacing: '0.05em' }}>USERNAME</TableCell>
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
                      <Switch inputProps={{ "aria-label": "toggle active" }} 
                        checked={u.is_active} 
                        size="small" 
                        color="primary"
                        inputProps={{ 'aria-label': `Toggle active status for ${u.username}` }}
                        onChange={async () => {
                          try {
                            const updated = await adminService.updateUser(u.id, { is_active: !u.is_active });
                            setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
                          } catch (err) {
                            console.error('Failed to toggle user status:', err);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton aria-label="action" size="small" onClick={() => handleOpenEdit(u)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'rgba(242,101,34,0.1)' } }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton aria-label="action" size="small" onClick={() => { setSelectedUser(u); setOpenDeleteDialog(true); }} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'rgba(239,68,68,0.1)' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
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
        </TableContainer>
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
                  <Grid item xs={12} sm={12}>
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
      {/* Edit User Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={() => setOpenEditDialog(false)}
        PaperProps={{ sx: { borderRadius: 3, width: '100%', maxWidth: 540, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          <Box sx={{ p: 1, bgcolor: 'rgba(242, 101, 34, 0.1)', borderRadius: 2, display: 'flex', color: 'primary.main' }}>
            <EditIcon fontSize="small" />
          </Box>
          Edit User: {selectedUser?.username}
        </DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{successMsg}</Alert>}
          {errorMsg && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{errorMsg}</Alert>}

          <form id="edit-user-form" onSubmit={handleEditSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" sx={labelSx}>
                  Full Name
                </Typography>
                <TextField 
                  fullWidth 
                  size="small"
                  name="full_name"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData(prev => ({...prev, full_name: e.target.value}))}
                  sx={inputSx}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" sx={labelSx}>
                  New Password (Optional)
                </Typography>
                <TextField 
                  fullWidth 
                  size="small"
                  name="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData(prev => ({...prev, password: e.target.value}))}
                  type="password"
                  placeholder="Leave blank to keep current"
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
                  value={editFormData.role}
                  onChange={(e) => setEditFormData(prev => ({...prev, role: e.target.value}))}
                  disabled={!isAdmin} // Only Admins can change roles
                  sx={selectSx}
                >
                  {isAdmin && <MenuItem value="TRAINER">Trainer</MenuItem>}
                  <MenuItem value="TRAINEE">Trainee</MenuItem>
                </Select>
              </Grid>

              {editFormData.role === 'TRAINEE' && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={labelSx}>
                    Employee ID
                  </Typography>
                  <TextField 
                    fullWidth 
                    size="small"
                    name="employee_id"
                    value={editFormData.employee_id}
                    onChange={(e) => setEditFormData(prev => ({...prev, employee_id: e.target.value}))}
                    sx={inputSx}
                  />
                </Grid>
              )}
            </Grid>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setOpenEditDialog(false)} 
            sx={{ color: 'text.secondary', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="edit-user-form"
            variant="contained" 
            color="primary"
            disabled={loading}
            sx={{ px: 3, borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)', '&:hover': { boxShadow: '0 6px 20px rgba(242, 101, 34, 0.5)' } }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={() => setOpenDeleteDialog(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          Delete User
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: 'DM Sans, sans-serif', color: 'text.secondary' }}>
            Are you sure you want to delete the user <strong>{selectedUser?.username}</strong>? This action cannot be undone.
          </Typography>
          {errorMsg && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{errorMsg}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setOpenDeleteDialog(false)} 
            sx={{ color: 'text.secondary', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteClick}
            variant="contained" 
            color="error"
            disabled={loading}
            sx={{ px: 3, borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
