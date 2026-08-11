import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Toolbar } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import SettingsIcon from '@mui/icons-material/Settings';

const drawerWidth = 280;

export default function Layout({ children }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: '1px solid rgba(0, 0, 0, 0.08)',
          },
        }}
      >
        <Toolbar sx={{ my: 2 }}>
          <Typography variant="h4" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', display: 'inline-block' }} />
            Viva Copilot
          </Typography>
        </Toolbar>
        <List sx={{ px: 2 }}>
          {['Dashboard', 'Interviews', 'Settings'].map((text, index) => (
            <ListItem key={text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                selected={index === 0}
                sx={{ 
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(242, 101, 34, 0.08)',
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'rgba(242, 101, 34, 0.12)',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                  {index === 0 ? <DashboardIcon /> : index === 1 ? <QuestionAnswerIcon /> : <SettingsIcon />}
                </ListItemIcon>
                <ListItemText primary={text} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, maxWidth: 1440, mx: 'auto', width: `calc(100% - ${drawerWidth}px)` }}>
        {children}
      </Box>
    </Box>
  );
}
