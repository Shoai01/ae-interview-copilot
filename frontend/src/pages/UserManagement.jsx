import { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, TextField, Button, 
  Select, MenuItem, Alert, CircularProgress, Stack, Grid 
} from '@mui/material';
import Layout from '../components/Layout';
import { adminService } from '../services/api';
import { useAuth } from '../store/AuthContext';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export default function UserManagement() {
  const { user } = useAuth();
  
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: user?.role === 'TRAINER' ? 'TRAINEE' : 'TRAINER', // Defaults
    full_name: '',
    employee_id: '',
    module_id: ''
  });

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const mods = await adminService.getModules();
        setModules(mods);
        if (mods.length > 0) {
          setFormData(prev => ({ ...prev, module_id: mods[0].id }));
        }
      } catch (err) {
        console.error("Failed to fetch modules:", err);
      }
    };
    fetchModules();
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

      await adminService.createUser(payload);
      
      setSuccessMsg(`Successfully created ${payload.role.toLowerCase()} account for ${payload.username}`);
      setFormData({
        username: '',
        password: '',
        role: user?.role === 'TRAINER' ? 'TRAINEE' : 'TRAINER',
        full_name: '',
        employee_id: '',
        module_id: modules.length > 0 ? modules[0].id : ''
      });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 800, mx: 'auto' }}>
        
        {/* Header */}
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: 'Syne, sans-serif', mb: 0.5 }}>
            Users & Access
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Provision accounts for new Trainees and Trainers.
          </Typography>
        </Box>

        {/* Form Card */}
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0px 4px 20px rgba(0,0,0,0.02)' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
              <PersonAddIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>
                Create New Account
              </Typography>
            </Stack>

            {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{successMsg}</Alert>}
            {errorMsg && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{errorMsg}</Alert>}

            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, ml: 0.5, fontWeight: 500 }}>
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
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, ml: 0.5, fontWeight: 500 }}>
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
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, ml: 0.5, fontWeight: 500 }}>
                    Role *
                  </Typography>
                  <Select 
                    fullWidth 
                    size="small"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    disabled={!isAdmin} // Only Admins can change roles
                  >
                    {isAdmin && <MenuItem value="TRAINER">Trainer</MenuItem>}
                    <MenuItem value="TRAINEE">Trainee</MenuItem>
                  </Select>
                  {!isAdmin && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      You only have permission to create Trainee accounts.
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, ml: 0.5, fontWeight: 500 }}>
                    Full Name
                  </Typography>
                  <TextField 
                    fullWidth 
                    size="small"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="John Doe"
                  />
                </Grid>

                {formData.role === 'TRAINEE' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, ml: 0.5, fontWeight: 500 }}>
                        Employee ID
                      </Typography>
                      <TextField 
                        fullWidth 
                        size="small"
                        name="employee_id"
                        value={formData.employee_id}
                        onChange={handleChange}
                        placeholder="EMP-001"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, ml: 0.5, fontWeight: 500 }}>
                        Assigned Module *
                      </Typography>
                      <Select 
                        fullWidth 
                        size="small"
                        name="module_id"
                        value={formData.module_id}
                        onChange={handleChange}
                        required={formData.role === 'TRAINEE'}
                      >
                        {modules.map(mod => (
                          <MenuItem key={mod.id} value={mod.id}>{mod.name}</MenuItem>
                        ))}
                      </Select>
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      color="primary"
                      disabled={loading}
                      sx={{ px: 4, py: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>

      </Box>
    </Layout>
  );
}
