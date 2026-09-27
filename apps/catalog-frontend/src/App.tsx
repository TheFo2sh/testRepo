import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowseRoomsScreen } from './ui/BrowseRoomsScreen';

const theme = createTheme();

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowseRoomsScreen />
    </ThemeProvider>
  );
}
