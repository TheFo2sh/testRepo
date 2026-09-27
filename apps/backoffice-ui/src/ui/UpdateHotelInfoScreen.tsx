import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { HotelInfo } from '../api/backofficeClient';
import { useUpdateHotelInfoStore } from '../state/updateHotelInfoStore';

export function UpdateHotelInfoScreen() {
  const hotelId = useUpdateHotelInfoStore((state) => state.hotelId);
  const city = useUpdateHotelInfoStore((state) => state.city);
  const status = useUpdateHotelInfoStore((state) => state.status);
  const hotelInfo = useUpdateHotelInfoStore((state) => state.hotelInfo);
  const error = useUpdateHotelInfoStore((state) => state.error);
  const setHotelId = useUpdateHotelInfoStore((state) => state.setHotelId);
  const setCity = useUpdateHotelInfoStore((state) => state.setCity);
  const submit = useUpdateHotelInfoStore((state) => state.submit);

  const submitting = status === 'submitting';
  const rejected = status === 'rejected';

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Update hotel info
      </Typography>
      <Box component="form" aria-label="Update hotel info" noValidate onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Hotel ID"
            value={hotelId}
            onChange={(event) => setHotelId(event.target.value)}
            disabled={submitting}
            required
          />
          <TextField
            label="City"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            disabled={submitting}
            error={rejected}
            helperText={rejected ? error : undefined}
          />
          <Button type="submit" variant="contained" disabled={submitting || hotelId.trim() === ''}>
            {submitting ? 'Updating…' : 'Update'}
          </Button>
        </Stack>
      </Box>
      {status === 'error' && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {status === 'updated' && hotelInfo && <UpdatedHotelInfo hotelInfo={hotelInfo} />}
    </Container>
  );
}

function UpdatedHotelInfo({ hotelInfo }: { hotelInfo: HotelInfo }) {
  return (
    <Card sx={{ mt: 3 }} aria-label="Updated hotel info">
      <CardContent>
        <Alert severity="success" sx={{ mb: 2 }}>
          Hotel {hotelInfo.hotelId} updated.
        </Alert>
        <Typography variant="h6" component="h2">
          {hotelInfo.hotelId}
        </Typography>
        <Typography>City: {hotelInfo.city}</Typography>
        <Typography>Stars: {hotelInfo.stars}</Typography>
        <Typography color="text.secondary">{hotelInfo.description}</Typography>
        <Typography variant="subtitle1" component="h3" sx={{ mt: 2 }}>
          Rooms
        </Typography>
        {hotelInfo.rooms.length === 0 ? (
          <Typography color="text.secondary">No rooms registered.</Typography>
        ) : (
          <List dense aria-label="Rooms">
            {hotelInfo.rooms.map((room) => (
              <ListItem key={room.roomId}>
                <ListItemText
                  primary={room.roomId}
                  secondary={[
                    room.numberOfBeds !== null ? `${room.numberOfBeds} beds` : null,
                    room.price !== null ? `€${room.price}` : null,
                    room.description || null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
