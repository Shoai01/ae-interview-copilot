import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Button, IconButton, InputBase } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MicIcon from '@mui/icons-material/Mic';
import SourceIcon from '@mui/icons-material/Source';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import { useAuth } from '../store/AuthContext';

const drawerWidth = 280;

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
    { text: 'Users & Access', icon: <PeopleIcon />, path: '/hr/users' },
  ];

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      {/* Sidebar Header */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>
          V
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', lineHeight: 1.2 }}>
            Viva Copilot<Typography component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>.</Typography>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            AI Voice Enterprise
          </Typography>
        </Box>
      </Box>

      {/* Primary CTA */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Button 
          variant="contained" 
          fullWidth 
          startIcon={<AddIcon />}
          sx={{ bgcolor: 'primary.main', color: '#fff', py: 1, borderRadius: 2, boxShadow: 'none' }}
        >
          New Session
        </Button>
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
    <Box sx={{ display: 'flex', width: '100vw', minHeight: '100vh', bgcolor: 'background.default' }}>
      
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
          height: 64, 
          px: { xs: 2, lg: 4 }, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          bgcolor: 'background.paper', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { lg: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ display: { xs: 'none', lg: 'block' }, fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>
              Trainer Review Dashboard
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 8, px: 2, py: 0.5, border: '1px solid rgba(0,0,0,0.08)' }}>
              <SearchIcon sx={{ color: 'text.secondary', fontSize: 20, mr: 1 }} />
              <InputBase placeholder="Search sessions..." sx={{ ml: 1, flex: 1, fontSize: 14 }} />
            </Box>
          </Box>
        </Box>

        {/* Page Content Canvas */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, lg: 4 }, display: 'block', width: '100%' }}>
          <Box sx={{ width: '100%', display: 'block' }}>
            {children}
          </Box>
        </Box>

      </Box>
    </Box>
  );
}
