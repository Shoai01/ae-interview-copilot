import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#F26522', // AutomationEdge Orange
      dark: '#A63B00',
      light: '#FFB599',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#535F74',
      dark: '#233144',
      light: '#D4E0F9',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8F9FF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0D1C2E',
      secondary: '#594138',
    },
    error: {
      main: '#ba1a1a',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '48px',
      fontWeight: 700,
      lineHeight: '56px',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '32px',
      fontWeight: 700,
      lineHeight: '40px',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '24px',
      fontWeight: 600,
      lineHeight: '32px',
    },
    h4: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: '28px',
    },
    body1: {
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: '24px',
    },
    body2: {
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: '20px',
    },
    button: {
      fontSize: '16px',
      fontWeight: 600,
      textTransform: 'none',
    },
    overline: {
      fontSize: '12px',
      fontWeight: 500,
      lineHeight: '16px',
      letterSpacing: '0.05em',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0px 4px 20px rgba(0,0,0,0.02)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#F26522',
            boxShadow: '0 0 0 2px rgba(242, 101, 34, 0.2)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#F1F5F9',
          color: '#535F74',
        },
      },
    },
  },
});

export default theme;
