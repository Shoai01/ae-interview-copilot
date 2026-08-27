import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, IconButton, Breadcrumbs, Link } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MicIcon from '@mui/icons-material/Mic';
import SourceIcon from '@mui/icons-material/Source';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HistoryIcon from '@mui/icons-material/History';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useAuth } from '@/store/AuthContext';

const drawerWidth = 268;

const ROUTE_LABEL_TO_PATH = {
  'Dashboard': '/hr/dashboard',
  'Sessions': '/hr/sessions',
  'Question Bank': '/hr/questions',
  'Knowledge Base': '/hr/knowledge',
  'Users & Access': '/hr/users',
  'Activity Log': '/hr/logs',
};

const getDefaultBreadcrumbs = (pathname) => {
  if (pathname === '/hr/dashboard' || pathname === '/hr' || pathname === '/') {
    return [{ label: 'Dashboard' }];
  }

  const crumbs = [{ label: 'Dashboard', path: '/hr/dashboard' }];

  if (pathname === '/hr/sessions') {
    crumbs.push({ label: 'Sessions' });
    return crumbs;
  }

  if (pathname.startsWith('/hr/review/')) {
    crumbs.push({ label: 'Sessions', path: '/hr/sessions' });
    crumbs.push({ label: 'Session Review' });
    return crumbs;
  }

  if (pathname === '/hr/questions') {
    crumbs.push({ label: 'Question Bank' });
    return crumbs;
  }

  if (pathname === '/hr/knowledge') {
    crumbs.push({ label: 'Knowledge Base' });
    return crumbs;
  }

  if (pathname === '/hr/users') {
    crumbs.push({ label: 'Users & Access' });
    return crumbs;
  }

  if (pathname === '/hr/logs') {
    crumbs.push({ label: 'Activity Log' });
    return crumbs;
  }

  if (pathname === '/change-password') {
    return [{ label: 'Account' }, { label: 'Change Password' }];
  }

  // Fallback: parse URL segments
  const segments = pathname.split('/').filter(Boolean);
  const relevantSegments = segments[0] === 'hr' ? segments.slice(1) : segments;
  let currentPath = segments[0] === 'hr' ? '/hr' : '';

  relevantSegments.forEach((segment, idx) => {
    currentPath += `/${segment}`;
    const isLast = idx === relevantSegments.length - 1;
    const readable = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/[-_]/g, ' ');
    crumbs.push({
      label: readable,
      path: isLast ? undefined : currentPath,
    });
  });

  return crumbs.length > 1 ? crumbs : [{ label: 'Dashboard' }];
};

const resolveBreadcrumbs = (customBreadcrumbs, pathname) => {
  if (!customBreadcrumbs || !Array.isArray(customBreadcrumbs) || customBreadcrumbs.length === 0) {
    return getDefaultBreadcrumbs(pathname);
  }

  const lastIndex = customBreadcrumbs.length - 1;
  return customBreadcrumbs.map((crumb, idx) => {
    const isLast = idx === lastIndex;
    if (typeof crumb === 'string') {
      return {
        label: crumb,
        path: isLast ? undefined : ROUTE_LABEL_TO_PATH[crumb],
      };
    }
    return {
      label: crumb.label,
      path: isLast ? undefined : crumb.path,
      onClick: crumb.onClick,
    };
  });
};

export default function Layout({ children, breadcrumbs }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const activeBreadcrumbs = resolveBreadcrumbs(breadcrumbs, location.pathname);

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
    { text: 'Activity Log', icon: <HistoryIcon />, path: '/hr/logs' },
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
            Viva Copilot
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
                  py: 1.2,
                  px: 2,
                  mb: 0.5,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.03)',
                    transform: 'translateX(2px)'
                  },
                  '&.Mui-selected': {
                    bgcolor: 'rgba(242, 101, 34, 0.08)',
                    color: '#F26522',
                    boxShadow: 'inset 4px 0 0 0 #F26522',
                    '&:hover': { 
                      bgcolor: 'rgba(242, 101, 34, 0.12)',
                      transform: 'translateX(2px)'
                    },
                    '& .MuiListItemIcon-root': { 
                      color: '#F26522',
                      transform: 'scale(1.1)',
                      transition: 'transform 0.2s'
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary', transition: 'all 0.2s' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  slotProps={{ 
                    primary: { 
                      variant: 'body2', 
                      fontFamily: 'DM Sans, sans-serif',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#F26522' : 'text.secondary',
                      transition: 'color 0.2s'
                    }
                  }} 
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer Navigation */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <List disablePadding>

          <ListItem disablePadding>
            <ListItemButton 
              sx={{ 
                borderRadius: 2, 
                py: 1.2,
                px: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(239, 68, 68, 0.08)',
                  color: '#ef4444',
                  transform: 'translateX(2px)',
                  '& .MuiListItemIcon-root': { color: '#ef4444' },
                  '& .MuiListItemText-primary': { color: '#ef4444' }
                }
              }} 
              onClick={handleLogout}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary', transition: 'color 0.2s' }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Sign Out" 
                slotProps={{ 
                  primary: { 
                    variant: 'body2', 
                    color: 'text.secondary', 
                    fontWeight: 600,
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'color 0.2s'
                  } 
                }} 
              />
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
          
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, mr: 2 }}>
            <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 1.5, display: { lg: 'none' } }}>
              <MenuIcon />
            </IconButton>

            <Breadcrumbs
              separator={
                <NavigateNextIcon 
                  sx={{ 
                    fontSize: 18, 
                    color: 'rgba(15, 23, 42, 0.35)',
                    mx: 0.25
                  }} 
                />
              }
              aria-label="breadcrumb"
              sx={{
                '& .MuiBreadcrumbs-ol': {
                  alignItems: 'center',
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                },
                '& .MuiBreadcrumbs-li': {
                  display: 'inline-flex',
                  alignItems: 'center',
                }
              }}
            >
              {activeBreadcrumbs.map((crumb, idx) => {
                const isLast = idx === activeBreadcrumbs.length - 1;

                if (isLast) {
                  return (
                    <Typography
                      key={crumb.label || idx}
                      variant="h6"
                      component="span"
                      sx={{
                        fontWeight: 700,
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: { xs: '1rem', sm: '1.2rem' },
                        color: '#0F172A',
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.2,
                      }}
                    >
                      {crumb.label}
                    </Typography>
                  );
                }

                return (
                  <Link
                    key={crumb.label || idx}
                    underline="none"
                    component="button"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (crumb.onClick) {
                        crumb.onClick();
                      } else if (crumb.path) {
                        navigate(crumb.path);
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      border: 'none',
                      bgcolor: 'transparent',
                      p: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: 'text.secondary',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: { xs: '0.875rem', sm: '0.95rem' },
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                  >
                    {crumb.label}
                  </Link>
                );
              })}
            </Breadcrumbs>
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
