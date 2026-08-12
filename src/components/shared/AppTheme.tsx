'use client';

import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: { main: '#7f1d3a', dark: '#5b1229', light: '#a94462' },
    secondary: { main: '#d99a3d' },
    background: { default: '#f8f4f1', paper: '#ffffff' },
  },
  typography: {
    fontFamily: 'var(--font-body), Arial, sans-serif',
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});

export function AppTheme({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>;
}
