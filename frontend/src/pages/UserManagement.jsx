import { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, Card, TextField, Button, 
  Select, MenuItem, Alert, CircularProgress, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Avatar, Switch, TableContainer, TablePagination, Tooltip, FormControl, InputLabel
} from '@mui/material';
import Layout from '@/components/Layout';
import { adminService } from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const { user } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    role: '',
    password: '',
    employee_id: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: user?.role === 'TRAINER' ? 'TRAINEE' : 'TRAINER',
    full_name: '',
    employee_id: '',
  });

  const fetchUsersData = async () => {
    setLoadingUsers(true);
    try {
      const fetchedUsers = await adminService.getUsers();
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      toast.error("Failed to load users");
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
        username: formData.username.trim(),
        password: formData.password,
        role: formData.role,
        full_name: formData.full_name.trim() || null,
      };
      if (formData.employee_id && formData.role === 'TRAINER') {
        payload.employee_id = formData.employee_id.trim();
      }

      const createdUser = await adminService.createUser(payload);
      
      setUsers(prev => [...prev, createdUser]);
      toast.success(`Created ${payload.role.toLowerCase()} account for ${payload.username}`);
      setFormData({
        username: '',
        password: '',
        role: user?.role === 'TRAINER' ? 'TRAINEE' : 'TRAINER',
        full_name: '',
        employee_id: '',
      });
      setOpenDialog(false);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create user.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setEditFormData({
      full_name: u.full_name || '',
      role: u.role,
      password: '',
      employee_id: u.employee_id || '',
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
        full_name: editFormData.full_name.trim() || null,
        role: editFormData.role
      };
      if (editFormData.password) {
        payload.password = editFormData.password;
      }
      if (editFormData.employee_id && editFormData.role === 'TRAINER') {
        payload.employee_id = editFormData.employee_id.trim();
      }
      
      const updatedUser = await adminService.updateUser(selectedUser.id, payload);
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
      toast.success(`Updated account for ${selectedUser.username}`);
      setOpenEditDialog(false);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update user.';
      setErrorMsg(msg);
      toast.error(msg);
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
      toast.success(`Deleted user ${selectedUser.username}`);
      setOpenDeleteDialog(false);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete user.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  // Generate avatar initials
  const getInitials = (name, username) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.trim().substring(0, 2).toUpperCase();
    }
    if (username) return username.substring(0, 2).toUpperCase();
    return 'U';
  };

  // KPIs
  const totalUsers = users.length;
  const traineeCount = useMemo(() => users.filter(u => u.role === 'TRAINEE').length, [users]);
  const trainerCount = useMemo(() => users.filter(u => u.role === 'TRAINER').length, [users]);
  const adminCount = useMemo(() => users.filter(u => u.role === 'ADMIN').length, [users]);
  const activeCount = useMemo(() => users.filter(u => u.is_active).length, [users]);
  const inactiveCount = useMemo(() => users.filter(u => !u.is_active).length, [users]);

  // Filtering
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()));
      
      let matchesRole = true;
      if (roleFilter === 'ALL') {
        matchesRole = true;
      } else if (roleFilter === 'ACTIVE') {
        matchesRole = u.is_active;
      } else if (roleFilter === 'INACTIVE') {
        matchesRole = !u.is_active;
      } else {
        matchesRole = u.role === roleFilter;
      }

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const rolePills = useMemo(() => {
    if (isAdmin) {
      return [
        { label: 'All Accounts', value: 'ALL', count: totalUsers },
        { label: 'Trainees', value: 'TRAINEE', count: traineeCount },
        { label: 'Trainers', value: 'TRAINER', count: trainerCount },
        ...(adminCount > 0 ? [{ label: 'Admins', value: 'ADMIN', count: adminCount }] : []),
      ];
    }
    return [
      { label: 'All Trainees', value: 'ALL', count: totalUsers },
      { label: 'Active', value: 'ACTIVE', count: activeCount },
      { label: 'Inactive', value: 'INACTIVE', count: inactiveCount },
    ];
  }, [isAdmin, totalUsers, traineeCount, trainerCount, adminCount, activeCount, inactiveCount]);

  return (
    <Layout breadcrumbs={[{ label: 'Dashboard', path: '/hr/dashboard' }, { label: 'User Management' }]}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 }, width: '100%' }}>
        
        {/* Header & Actions */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0F172A', letterSpacing: '-0.02em' }}>
                User Management
              </Typography>
              <Tooltip title="Refresh users" arrow>
                <IconButton 
                  onClick={fetchUsersData} 
                  size="small" 
                  disabled={loadingUsers} 
                  sx={{ 
                    color: 'primary.main', 
                    bgcolor: 'rgba(242, 101, 34, 0.08)',
                    border: '1px solid rgba(242, 101, 34, 0.2)',
                    '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.16)' } 
                  }}
                >
                  <SyncIcon sx={{ fontSize: 18, animation: loadingUsers ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', mt: 0.5 }}>
              Provision, manage, and audit system access for trainers, evaluators, and candidates.
            </Typography>
          </Box>
          <Box>
            <Button 
              variant="contained" 
              startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />}
              onClick={() => { setOpenDialog(true); setSuccessMsg(''); setErrorMsg(''); }}
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
            >
              Add New User
            </Button>
          </Box>
        </Box>

        {/* KPI Strip */}
        <Box sx={{ display: 'grid', gridTemplateColumns: isAdmin ? { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } : { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                {isAdmin ? 'Total Accounts' : 'Total Trainees'}
              </Typography>
              <Typography variant="h4" sx={{ color: '#0F172A', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                {isAdmin ? totalUsers : traineeCount}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(242, 101, 34, 0.1)', color: '#F26522', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GroupOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          {isAdmin && (
            <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                  Trainees
                </Typography>
                <Typography variant="h4" sx={{ color: '#7C3AED', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                  {traineeCount}
                </Typography>
              </Box>
              <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SchoolOutlinedIcon sx={{ fontSize: 24 }} />
              </Box>
            </Card>
          )}

          {isAdmin && (
            <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                  Trainers & Staff
                </Typography>
                <Typography variant="h4" sx={{ color: '#059669', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                  {trainerCount + adminCount}
                </Typography>
              </Box>
              <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SupervisorAccountOutlinedIcon sx={{ fontSize: 24 }} />
              </Box>
            </Card>
          )}

          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                {isAdmin ? 'Active Accounts' : 'Active Trainees'}
              </Typography>
              <Typography variant="h4" sx={{ color: '#16A34A', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                {activeCount}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          {!isAdmin && (
            <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                  Inactive Trainees
                </Typography>
                <Typography variant="h4" sx={{ color: '#D97706', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                  {inactiveCount}
                </Typography>
              </Box>
              <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SchoolOutlinedIcon sx={{ fontSize: 24 }} />
              </Box>
            </Card>
          )}
        </Box>

        {/* Toolbar & Filter Card */}
        <Card elevation={0} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            justifyContent: 'space-between', 
            alignItems: { xs: 'stretch', md: 'center' }, 
            p: 2, 
            gap: 2,
            borderBottom: '1px solid #E2E8F0' 
          }}>
            {/* Role Filter Pills */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {rolePills.map(pill => {
                const isSelected = roleFilter === pill.value;
                return (
                  <Button
                    key={pill.value}
                    size="small"
                    onClick={() => { setRoleFilter(pill.value); setPage(0); }}
                    sx={{
                      borderRadius: 2,
                      px: 2,
                      py: 0.6,
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 700 : 500,
                      fontFamily: 'DM Sans, sans-serif',
                      textTransform: 'none',
                      bgcolor: isSelected ? '#F26522' : '#F8FAFC',
                      color: isSelected ? '#FFFFFF' : '#64748B',
                      border: `1px solid ${isSelected ? '#F26522' : '#E2E8F0'}`,
                      '&:hover': {
                        bgcolor: isSelected ? '#e8581a' : '#F1F5F9',
                      }
                    }}
                  >
                    {pill.label} ({pill.count})
                  </Button>
                );
              })}
            </Box>

            {/* Search Input */}
            <Box sx={{ position: 'relative', width: { xs: '100%', md: 280 } }}>
              <SearchIcon sx={{ color: '#94A3B8', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, pointerEvents: 'none' }} />
              <TextField 
                placeholder="Search name or username..."
                size="small"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': {
                    pl: 4,
                    pr: 1.5,
                    bgcolor: '#F8FAFC',
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    fontFamily: 'DM Sans, sans-serif',
                    '& fieldset': { borderColor: '#E2E8F0' },
                    '&:hover fieldset': { borderColor: '#CBD5E1' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '1.5px' },
                  }
                }}
              />
            </Box>
          </Box>

          {/* Users Table */}
          <TableContainer>
            {loadingUsers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress color="primary" />
              </Box>
            ) : (
              <Table aria-label="user management table">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', py: 1.75, borderBottom: '1px solid #E2E8F0' } }}>
                    <TableCell>User</TableCell>
                    <TableCell>Username / Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="center">Active Status</TableCell>
                    <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 8, borderBottom: 'none' }}>
                        <Typography sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
                          No users found matching the selected filter.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : paginatedUsers.map((u) => (
                    <TableRow key={u.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: '#F8FAFC' } }}>
                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9', py: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1.75}>
                          <Avatar sx={{ 
                            width: 38, 
                            height: 38, 
                            fontSize: 13, 
                            fontWeight: 700,
                            bgcolor: u.role === 'ADMIN' ? '#131C2E' : (u.role === 'TRAINER' ? 'rgba(124, 58, 237, 0.12)' : 'rgba(242, 101, 34, 0.12)'),
                            color: u.role === 'ADMIN' ? '#FFFFFF' : (u.role === 'TRAINER' ? '#7C3AED' : '#F26522'),
                            border: u.role === 'ADMIN' ? 'none' : (u.role === 'TRAINER' ? '1px solid rgba(124, 58, 237, 0.2)' : '1px solid rgba(242, 101, 34, 0.2)'),
                          }}>
                            {getInitials(u.full_name, u.username)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
                              {u.full_name || u.username}
                            </Typography>
                            {u.employee_id && (
                              <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
                                ID: {u.employee_id}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', borderBottom: '1px solid #F1F5F9', py: 2 }}>
                        {u.username}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9', py: 2 }}>
                        <Chip 
                          size="small" 
                          label={u.role} 
                          sx={{ 
                            bgcolor: u.role === 'ADMIN' ? '#131C2E' : (u.role === 'TRAINER' ? 'rgba(124, 58, 237, 0.08)' : 'rgba(242, 101, 34, 0.08)'),
                            color: u.role === 'ADMIN' ? '#FFFFFF' : (u.role === 'TRAINER' ? '#7C3AED' : '#F26522'),
                            border: u.role === 'ADMIN' ? 'none' : (u.role === 'TRAINER' ? '1px solid rgba(124, 58, 237, 0.25)' : '1px solid rgba(242, 101, 34, 0.25)'),
                            fontWeight: 700, 
                            borderRadius: 1, 
                            fontFamily: 'DM Sans, sans-serif', 
                            fontSize: '0.75rem',
                            letterSpacing: '0.02em',
                          }} 
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ borderBottom: '1px solid #F1F5F9', py: 2 }}>
                        <Switch 
                          checked={u.is_active} 
                          size="small" 
                          color="primary"
                          inputProps={{ 'aria-label': `Toggle active status for ${u.username}` }}
                          onChange={async () => {
                            try {
                              const updated = await adminService.updateUser(u.id, { is_active: !u.is_active });
                              setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
                              toast.success(`${u.username} is now ${!u.is_active ? 'active' : 'inactive'}`);
                            } catch (err) {
                              console.error('Failed to toggle user status:', err);
                              toast.error('Failed to update status');
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ borderBottom: '1px solid #F1F5F9', py: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Tooltip title="Edit User" arrow>
                            <IconButton aria-label="edit user" size="small" onClick={() => handleOpenEdit(u)} sx={{ color: '#64748B', bgcolor: 'rgba(242, 101, 34, 0.08)', '&:hover': { color: '#F26522', bgcolor: 'rgba(242, 101, 34, 0.18)' } }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User" arrow>
                            <IconButton aria-label="delete user" size="small" onClick={() => { setSelectedUser(u); setOpenDeleteDialog(true); }} sx={{ color: '#64748B', bgcolor: 'rgba(239, 68, 68, 0.08)', '&:hover': { color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.18)' } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredUsers.length}
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

      {/* Add User Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 3, 
            border: '1px solid #E2E8F0', 
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)', 
            overflow: 'hidden' 
          } 
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.25rem', bgcolor: '#FFFFFF', color: '#0F172A', borderBottom: '1px solid #E2E8F0', pb: 2, pt: 2.5 }}>
          <Box sx={{ p: 1, bgcolor: 'rgba(242, 101, 34, 0.1)', borderRadius: 2, display: 'flex', color: 'primary.main' }}>
            <PersonAddIcon fontSize="small" />
          </Box>
          Create New Account
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: '24px !important', bgcolor: '#FFFFFF' }}>
          {successMsg && <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }}>{successMsg}</Alert>}
          {errorMsg && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{errorMsg}</Alert>}

          <form id="add-user-form" onSubmit={handleSubmit}>
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              <TextField 
                fullWidth 
                required 
                label="Email / Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="trainee@company.com"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              
              <TextField 
                fullWidth 
                required 
                label="Temporary Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                type="password"
                placeholder="••••••••"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />

              <FormControl fullWidth>
                <InputLabel id="role-select-label">Account Role *</InputLabel>
                <Select 
                  labelId="role-select-label"
                  label="Account Role *"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  sx={{ borderRadius: 2 }}
                >
                  {isAdmin && <MenuItem value="TRAINER">Trainer</MenuItem>}
                  <MenuItem value="TRAINEE">Trainee</MenuItem>
                </Select>
              </FormControl>

              <TextField 
                fullWidth 
                label="Full Name (Optional)"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="John Doe"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />

              {formData.role === 'TRAINER' && (
                <TextField 
                  fullWidth 
                  label="AE Code (Employee ID)"
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleChange}
                  placeholder="AE-001"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              )}
            </Stack>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button 
            onClick={() => setOpenDialog(false)} 
            sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="add-user-form"
            variant="contained" 
            disabled={loading || !formData.username.trim() || !formData.password}
            sx={{ 
              background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
              color: '#FFFFFF !important',
              px: 3, 
              py: 0.9,
              borderRadius: 2, 
              textTransform: 'none', 
              fontWeight: 700, 
              fontFamily: 'DM Sans, sans-serif',
              boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)', 
              '&:hover': { boxShadow: '0 6px 20px rgba(242, 101, 34, 0.4)' } 
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 3, 
            border: '1px solid #E2E8F0', 
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)', 
            overflow: 'hidden' 
          } 
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.25rem', bgcolor: '#FFFFFF', color: '#0F172A', borderBottom: '1px solid #E2E8F0', pb: 2, pt: 2.5 }}>
          <Box sx={{ p: 1, bgcolor: 'rgba(242, 101, 34, 0.1)', borderRadius: 2, display: 'flex', color: 'primary.main' }}>
            <EditIcon fontSize="small" />
          </Box>
          Edit User: {selectedUser?.username}
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: '24px !important', bgcolor: '#FFFFFF' }}>
          {successMsg && <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }}>{successMsg}</Alert>}
          {errorMsg && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{errorMsg}</Alert>}

          <form id="edit-user-form" onSubmit={handleEditSubmit}>
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              <TextField 
                fullWidth 
                label="Full Name"
                name="full_name"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData(prev => ({...prev, full_name: e.target.value}))}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              
              <TextField 
                fullWidth 
                label="New Password (Optional)"
                name="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData(prev => ({...prev, password: e.target.value}))}
                type="password"
                placeholder="Leave blank to keep existing password"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />

              <FormControl fullWidth>
                <InputLabel id="edit-role-select-label">Account Role *</InputLabel>
                <Select 
                  labelId="edit-role-select-label"
                  label="Account Role *"
                  name="role"
                  value={editFormData.role}
                  onChange={(e) => setEditFormData(prev => ({...prev, role: e.target.value}))}
                  disabled={!isAdmin}
                  sx={{ borderRadius: 2 }}
                >
                  {isAdmin && <MenuItem value="TRAINER">Trainer</MenuItem>}
                  <MenuItem value="TRAINEE">Trainee</MenuItem>
                </Select>
              </FormControl>

              {editFormData.role === 'TRAINER' && (
                <TextField 
                  fullWidth 
                  label="AE Code (Employee ID)"
                  name="employee_id"
                  value={editFormData.employee_id}
                  onChange={(e) => setEditFormData(prev => ({...prev, employee_id: e.target.value}))}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              )}
            </Stack>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button 
            onClick={() => setOpenEditDialog(false)} 
            sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="edit-user-form"
            variant="contained" 
            disabled={loading}
            sx={{ 
              background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
              color: '#FFFFFF !important',
              px: 3, 
              py: 0.9,
              borderRadius: 2, 
              textTransform: 'none', 
              fontWeight: 700, 
              fontFamily: 'DM Sans, sans-serif',
              boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)', 
              '&:hover': { boxShadow: '0 6px 20px rgba(242, 101, 34, 0.4)' } 
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 3, 
            border: '1px solid #E2E8F0', 
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)', 
            overflow: 'hidden' 
          } 
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: '#DC2626', bgcolor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', pb: 2, pt: 2.5 }}>
          Delete User Account
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: '24px !important', bgcolor: '#FFFFFF' }}>
          <Typography sx={{ fontFamily: 'DM Sans, sans-serif', color: '#475569', lineHeight: 1.6 }}>
            Are you sure you want to permanently delete the user <strong>{selectedUser?.username}</strong>? All their session histories and credentials will be removed.
          </Typography>
          {errorMsg && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{errorMsg}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button 
            onClick={() => setOpenDeleteDialog(false)} 
            sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteClick}
            variant="contained" 
            color="error"
            disabled={loading}
            sx={{ px: 3, py: 0.9, borderRadius: 2, textTransform: 'none', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
