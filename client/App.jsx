import React from 'react'
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import DataRequest from './components/DataRequest'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7dd3fc' },
    secondary: { main: '#a78bfa' },
    background: { default: '#08111f', paper: '#111d31' },
    text: { primary: '#edf5ff', secondary: '#9fb1c9' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    h1: { letterSpacing: '-0.04em' },
    h2: { letterSpacing: '-0.025em' },
  },
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DataRequest />
    </ThemeProvider>
  )
}

export default App
