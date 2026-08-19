import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, IconButton } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MicIcon from '@mui/icons-material/Mic';
import SourceIcon from '@mui/icons-material/Source';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useAuth } from '@/store/AuthContext';

const drawerWidth = 268;

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/hr/dashboard' },
    { text: 'Sessions', icon: <MicIcon />, path: '/hr/sessions' },
    { text: 'Question Bank', icon: <SourceIcon />, path: '/hr/questions' },
    { text: 'Knowledge Base', icon: <MenuBookIcon />, path: '/hr/knowledge' },
    { text: 'Users & Access', icon: <PeopleIcon />, path: '/hr/users' },
  ];

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(10px)', borderRight: '1px solid rgba(0, 0, 0, 0.05)' }}>
      {/* Sidebar Header */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>
          V
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', lineHeight: 1.2 }}>
            Viva Copilot<Typography component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>.</Typography>
          </Typography>

        </Box>
      </Box>


      {/* Main Navigation */}
      <List sx={{ px: 2, flex: 1, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isSelected = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                selected={isSelected}
                onClick={() => navigate(item.path)}
                sx={{ 
                  borderRadius: 2,
                  py: 1,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(242, 101, 34, 0.08)',
                    color: 'primary.main',
                    borderRight: '3px solid #F26522',
                    '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.12)' },
                    '& .MuiListItemIcon-root': { color: 'primary.main' }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ variant: 'body2', fontWeight: isSelected ? 600 : 500 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer Navigation */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <List disablePadding>

          <ListItem disablePadding>
            <ListItemButton sx={{ borderRadius: 2, py: 1 }} onClick={handleLogout}>
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Sign Out" primaryTypographyProps={{ variant: 'body2', color: 'text.secondary', fontWeight: 500 }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden', bgcolor: 'transparent' }}>
      
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' },
        }}
        open
      >
        {drawerContent}
      </Drawer>
      
      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Top App Bar */}
        <Box component="header" sx={{ 
          height: 72, 
          px: { xs: 2, lg: 4 }, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          bgcolor: 'transparent', 
          zIndex: 30
        }}>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { lg: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ display: 'block', fontWeight: 600 }}>
              {navItems.find(item => location.pathname.startsWith(item.path))?.text || 'Dashboard'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          </Box>
        </Box>

        {/* Page Content Canvas - Glass Container */}
        <Box sx={{
          flexGrow: 1, 
          m: { xs: 1, sm: 1, md: 1.5 }, 
          mt: 0,
          bgcolor: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 'var(--radius)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box className="glass-container" sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, md: 3, lg: 4 } }}>
            {children}
          </Box>
        </Box>

      </Box>
    </Box>
  );
}
