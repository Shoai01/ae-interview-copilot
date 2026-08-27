import { createTheme } from '@mui/material/styles';

// Edge Assistant Design System (Light Mode)
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#F26522', 
      dark: '#d9581b',
      light: '#ff8c42',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#475569',
      dark: '#0a1628',
      light: '#94a3b8',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#f8fafc', // App Root
      paper: '#ffffff',   // Paper/Surface
    },
    text: {
      primary: '#0a1628',
      secondary: '#475569',
      disabled: '#94a3b8'
    },
    error: {
      main: '#ef4444',
    },
    success: {
      main: '#4ade80'
    },
    warning: {
      main: '#ff9800'
    }
  },
  typography: {
    fontFamily: '"DM Sans", "Inter", sans-serif',
    h1: {
      fontFamily: '"Syne", sans-serif',
      fontSize: '48px',
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    h2: {
      fontFamily: '"Syne", sans-serif',
      fontSize: '32px',
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    h3: {
      fontFamily: '"Syne", sans-serif',
      fontSize: '24px',
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    h4: {
      fontFamily: '"Syne", sans-serif',
      fontSize: '20px',
      fontWeight: 600,
      letterSpacing: '-0.5px',
    },
    h5: {
      fontFamily: '"Syne", sans-serif',
      fontSize: '18px',
      fontWeight: 600,
      letterSpacing: '-0.5px',
    },
    h6: {
      fontFamily: '"Syne", sans-serif',
      fontSize: '16px',
      fontWeight: 600,
      letterSpacing: '-0.5px',
    },
    body1: {
      fontSize: '15px',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    button: {
      fontFamily: '"DM Sans", sans-serif',
      fontSize: '15px',
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 10, // Default components radius
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: 'none',
          textTransform: 'none',
          fontWeight: 700,
        },
        containedPrimary: {
          background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
          boxShadow: '0 4px 20px rgba(242,101,34,0.35)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: '0 6px 25px rgba(242,101,34,0.45)',
          },
        },
        outlinedPrimary: {
          borderColor: '#F26522',
          color: '#F26522',
          backgroundColor: 'transparent',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(242,101,34,0.06)',
            borderColor: '#e8581a',
          }
        }
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderRadius: 10,
        },
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: 10,
          boxShadow: 'none',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#f9fafb',
          transition: 'all 0.2s ease',
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#F26522',
            borderWidth: '1.5px',
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 3px rgba(242,101,34,0.10)',
          }
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          backgroundColor: '#f8fafc',
          position: 'sticky',
          top: 0,
          zIndex: 2
        }
      }
    },
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--radius': '24px',
          '--ae-surface': 'rgba(0, 0, 0, 0.04)',
          overflow: 'auto',
        },
        body: {
          overflow: 'auto',
          backgroundColor: '#f8fafc',
          backgroundImage: 'radial-gradient(ellipse 80% 60% at 15% 10%, rgba(242,101,34,0.06) 0%, transparent 60%)',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        },
        /* Custom Scrollbars */
        '*::-webkit-scrollbar': {
          width: '16px',
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: '#F26522',
          border: '4px solid #ffffff',
          backgroundClip: 'padding-box',
          borderRadius: '20px',
        },
        /* When scrollbar is on the dark transparent surface */
        '.glass-container::-webkit-scrollbar-thumb': {
          border: '4px solid #f8fafc',
        }
      }
    }
  },
});

export default theme;
