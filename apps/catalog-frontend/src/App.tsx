import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowseRoomsScreen } from './ui/BrowseRoomsScreen';
import { SearchRoomsScreen } from './ui/SearchRoomsScreen';

const theme = createTheme();

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SearchRoomsScreen />
      <BrowseRoomsScreen />
    </ThemeProvider>
  );
}
