import { useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import {
  selectBrowseRoomsError,
  selectBrowseRoomsResults,
  selectBrowseRoomsStatus,
  selectBrowseRoomsTotal,
  selectLoadBrowseRooms,
  useBrowseRoomsStore,
  type Room,
} from '../state/browseRoomsStore';

const priceFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const formatPrice = (price: number) => priceFormat.format(price);

export function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormat.format(date);
}

/** One room's contract fields; `description` is shown when the response supplies it (SearchRooms). */
export function RoomCard({ room }: { room: Room & { description?: string } }) {
  const headingId = `room-${room.roomId}-heading`;
  return (
    <Card component="article" aria-labelledby={headingId} variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography id={headingId} variant="h6" component="h2">
          Room {room.roomId}
        </Typography>
        <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.5 }}>
          <Typography component="dt" color="text.secondary">Hotel</Typography>
          <Typography component="dd" sx={{ m: 0 }}>{room.hotelId}</Typography>
          <Typography component="dt" color="text.secondary">City</Typography>
          <Typography component="dd" sx={{ m: 0 }}>{room.city}</Typography>
          <Typography component="dt" color="text.secondary">Price</Typography>
          <Typography component="dd" sx={{ m: 0 }}>{formatPrice(room.price)}</Typography>
          <Typography component="dt" color="text.secondary">Beds</Typography>
          <Typography component="dd" sx={{ m: 0 }}>{room.numberOfBeds}</Typography>
          <Typography component="dt" color="text.secondary">Available</Typography>
          <Typography component="dd" sx={{ m: 0 }}>
            <time dateTime={room.availableFrom}>{formatDateTime(room.availableFrom)}</time>
            {' – '}
            <time dateTime={room.availableTo}>{formatDateTime(room.availableTo)}</time>
          </Typography>
          {room.description && (
            <>
              <Typography component="dt" color="text.secondary">Description</Typography>
              <Typography component="dd" sx={{ m: 0 }}>{room.description}</Typography>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export function BrowseRoomsScreen() {
  const status = useBrowseRoomsStore(selectBrowseRoomsStatus);
  const results = useBrowseRoomsStore(selectBrowseRoomsResults);
  const total = useBrowseRoomsStore(selectBrowseRoomsTotal);
  const error = useBrowseRoomsStore(selectBrowseRoomsError);
  const loadBrowseRooms = useBrowseRoomsStore(selectLoadBrowseRooms);

  useEffect(() => {
    void loadBrowseRooms();
  }, [loadBrowseRooms]);

  return (
    <Box component="main" sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Browse rooms
      </Typography>

      {(status === 'idle' || status === 'loading') && (
        <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress aria-label="Loading rooms" />
          <Typography>Loading rooms…</Typography>
        </Box>
      )}

      {status === 'error' && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadBrowseRooms()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {status === 'success' && (
        <>
          <Typography component="p" variant="subtitle1" sx={{ mb: 2 }} aria-live="polite">
            {total === 1 ? '1 room' : `${total} rooms`}
          </Typography>
          {results.length === 0 ? (
            <Alert severity="info">No rooms are available right now.</Alert>
          ) : (
            <Grid container spacing={2} component="ul" aria-label="Rooms" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {results.map((room) => (
                <Grid key={room.roomId} component="li" size={{ xs: 12, sm: 6, md: 4 }}>
                  <RoomCard room={room} />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}
