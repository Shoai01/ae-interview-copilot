import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Breadcrumbs,
  Link,
  Avatar,
  Chip,
  Tooltip
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MicIcon from '@mui/icons-material/Mic';
import SourceIcon from '@mui/icons-material/Source';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HistoryIcon from '@mui/icons-material/History';
import InsightsIcon from '@mui/icons-material/Insights';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useAuth } from '@/store/AuthContext';
import api from '@/services/api';

const drawerWidth = 260;

const ROUTE_LABEL_TO_PATH = {
  'Dashboard': '/hr/dashboard',
  'Sessions': '/hr/sessions',
  'Question Bank': '/hr/questions',
  'Knowledge Base': '/hr/knowledge',
  'Users & Access': '/hr/users',
  'Activity Log': '/hr/logs',
  'Usage Analytics': '/hr/usage',
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

  if (pathname === '/hr/usage') {
    crumbs.push({ label: 'Usage Analytics' });
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
  const [engineStatus, setEngineStatus] = React.useState('checking'); // 'active' | 'down' | 'checking'
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const activeBreadcrumbs = resolveBreadcrumbs(breadcrumbs, location.pathname);

  // Poll GET /health every 30s to dynamically track backend & DB engine status
  React.useEffect(() => {
    let isMounted = true;

    const checkEngineHealth = async () => {
      try {
        const response = await api.get('/health', { timeout: 5000 });
        if (isMounted) {
          if (response.data?.engine === 'active' || response.data?.status === 'ok') {
            setEngineStatus('active');
          } else {
            setEngineStatus('down');
          }
        }
      } catch {
        if (isMounted) {
          setEngineStatus('down');
        }
      }
    };

    checkEngineHealth();
    const intervalId = setInterval(checkEngineHealth, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

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
    { text: 'Usage Analytics', icon: <InsightsIcon />, path: '/hr/usage', adminOnly: true },
  ].filter((item) => !item.adminOnly || user?.role === 'ADMIN');

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';
  const roleLabel = user?.role === 'ADMIN' ? 'Admin' : 'Trainer';

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#131C2E',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: 'radial-gradient(circle at 20% 15%, rgba(242, 101, 34, 0.12) 0%, transparent 60%)',
      }}
    >
      {/* Sidebar Header with Official AutomationEdge Branding */}
      <Box
        sx={{
          p: 2.5,
          px: 2.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 1,
        }}
      >
        <Box
          component="img"
          src="/ae-icon.png"
          alt="AutomationEdge"
          sx={{ height: 28, width: 'auto', objectFit: 'contain' }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.2,
              color: '#FFFFFF',
              fontSize: '1.05rem',
              letterSpacing: '-0.01em',
            }}
          >
            Viva Copilot
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: '#94A3B8',
              fontSize: '0.72rem',
              display: 'block',
              fontWeight: 500,
            }}
          >
            Assessment Portal
          </Typography>
        </Box>
      </Box>

      {/* Main Navigation List */}
      <List sx={{ px: 1.75, py: 2.5, flex: 1, overflowY: 'auto', zIndex: 1 }}>
        {navItems.map((item) => {
          const isSelected = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.75 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  py: 1.15,
                  px: 1.75,
                  transition: 'all 0.18s ease',
                  color: isSelected ? '#FFFFFF' : '#94A3B8',
                  bgcolor: isSelected ? 'rgba(242, 101, 34, 0.14)' : 'transparent',
                  border: isSelected ? '1px solid rgba(242, 101, 34, 0.28)' : '1px solid transparent',
                  '&:hover': {
                    bgcolor: isSelected ? 'rgba(242, 101, 34, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                    color: '#FFFFFF',
                    '& .MuiListItemIcon-root': {
                      color: isSelected ? '#F26522' : '#FFFFFF',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isSelected ? '#F26522' : '#94A3B8',
                    transition: 'color 0.18s ease',
                    '& svg': { fontSize: 20 },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  slotProps={{
                    primary: {
                      variant: 'body2',
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? '#FFFFFF' : '#94A3B8',
                      fontSize: '0.875rem',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Sidebar Footer with Logged-In User Profile Card */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: 'rgba(0, 0, 0, 0.25)',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                fontSize: '0.875rem',
                fontWeight: 700,
                bgcolor: 'rgba(242, 101, 34, 0.18)',
                color: 'primary.main',
                border: '1px solid rgba(242, 101, 34, 0.3)',
              }}
            >
              {userInitial}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  color: '#F8FAFC',
                  lineHeight: 1.2,
                }}
              >
                {user?.username || 'Authenticated User'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#94A3B8',
                  fontSize: '0.7rem',
                  display: 'block',
                  lineHeight: 1.2,
                  mt: 0.25,
                }}
              >
                {roleLabel}
              </Typography>
            </Box>
          </Box>

          <Tooltip title="Sign Out" placement="top">
            <IconButton
              size="small"
              onClick={handleLogout}
              sx={{
                color: '#94A3B8',
                borderRadius: 1.5,
                p: 0.75,
                '&:hover': {
                  color: '#EF4444',
                  bgcolor: 'rgba(239, 68, 68, 0.12)',
                },
              }}
            >
              <LogoutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

    </Box>
  );

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden', bgcolor: '#F8FAFC' }}>
      
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            bgcolor: '#131C2E',
            borderRadius: 0,
          },
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
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            bgcolor: '#131C2E',
            borderRadius: 0,
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
      
      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#F8FAFC' }}>
        
        {/* Top App Bar */}
        <Box
          component="header"
          sx={{
            height: 64,
            px: { xs: 2, lg: 3.5 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            zIndex: 10,
          }}
        >
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, mr: 2 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ mr: 1.5, display: { lg: 'none' }, color: '#475569' }}
            >
              <MenuIcon />
            </IconButton>

            <Breadcrumbs
              separator={
                <NavigateNextIcon
                  sx={{
                    fontSize: 16,
                    color: '#94A3B8',
                    mx: 0.25,
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
                },
              }}
            >
              {activeBreadcrumbs.map((crumb, idx) => {
                const isLast = idx === activeBreadcrumbs.length - 1;

                if (isLast) {
                  return (
                    <Typography
                      key={crumb.label || idx}
                      variant="subtitle2"
                      component="span"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: '0.95rem', sm: '1.05rem' },
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
                      color: '#64748B',
                      fontSize: { xs: '0.85rem', sm: '0.925rem' },
                      fontWeight: 500,
                      transition: 'color 0.18s ease',
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

          {/* Right Header Status & Role Indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip
              title={
                engineStatus === 'active'
                  ? 'Evaluation Engine & Database Operational'
                  : engineStatus === 'down'
                  ? 'Evaluation Engine Offline — Database Disconnected'
                  : 'Verifying system connectivity...'
              }
              arrow
            >
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, cursor: 'default' }}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor:
                      engineStatus === 'active'
                        ? '#22C55E'
                        : engineStatus === 'down'
                        ? '#EF4444'
                        : '#F59E0B',
                    boxShadow:
                      engineStatus === 'active'
                        ? '0 0 6px rgba(34, 197, 94, 0.45)'
                        : engineStatus === 'down'
                        ? '0 0 6px rgba(239, 68, 68, 0.45)'
                        : 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      engineStatus === 'active'
                        ? '#64748B'
                        : engineStatus === 'down'
                        ? '#EF4444'
                        : '#94A3B8',
                    fontWeight: 500,
                    fontSize: '0.78rem',
                    transition: 'color 0.3s ease',
                  }}
                >
                  {engineStatus === 'active'
                    ? 'Engine Active'
                    : engineStatus === 'down'
                    ? 'Engine Offline'
                    : 'Connecting...'}
                </Typography>
              </Box>
            </Tooltip>

            <Chip
              label={roleLabel}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.03em',
                bgcolor: 'rgba(242, 101, 34, 0.08)',
                color: 'primary.main',
                border: '1px solid rgba(242, 101, 34, 0.2)',
                borderRadius: 1,
              }}
            />
          </Box>
        </Box>

        {/* Page Content Canvas */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            p: { xs: 2.5, sm: 3.5, lg: 4 },
          }}
        >
          {children}
        </Box>

      </Box>
    </Box>
  );
}
