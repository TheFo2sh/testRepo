import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { UpdateHotelInfoScreen } from './ui/UpdateHotelInfoScreen';

const theme = createTheme();

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UpdateHotelInfoScreen />
    </ThemeProvider>
  );
}
