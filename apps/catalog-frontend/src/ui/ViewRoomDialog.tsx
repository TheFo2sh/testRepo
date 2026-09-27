import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import {
  getViewRoomStore,
  selectViewRoom,
  selectViewRoomError,
  selectViewRoomId,
  selectViewRoomStatus,
  useViewRoomStore,
  type RoomDetail,
} from '../state/viewRoomStore';
import { formatDateTime, formatPrice } from './BrowseRoomsScreen';

function RoomDetails({ room }: { room: RoomDetail }) {
  const field = (label: string, value: ReactNode) => (
    <>
      <Typography component="dt" color="text.secondary">{label}</Typography>
      <Typography component="dd" sx={{ m: 0 }}>{value}</Typography>
    </>
  );

  return (
    <Box
      component="dl"
      aria-label="Room details"
      sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 3, rowGap: 1 }}
    >
      {field('Room', room.roomId)}
      {field('Hotel', room.hotelId)}
      {field('City', room.city)}
      {field('Beds', room.numberOfBeds)}
      {field('Available from', <time dateTime={room.availableFrom}>{formatDateTime(room.availableFrom)}</time>)}
      {field('Available to', <time dateTime={room.availableTo}>{formatDateTime(room.availableTo)}</time>)}
      {field('Price', formatPrice(room.price))}
      {field(
        'Description',
        room.description.trim() ? room.description : <Box component="span" sx={{ color: 'text.secondary' }}>No description available.</Box>,
      )}
    </Box>
  );
}

/** Shows the room opened in the ViewRoom state; all requests are made by the state. */
export function ViewRoomDialog() {
  const roomId = useViewRoomStore(selectViewRoomId);
  const status = useViewRoomStore(selectViewRoomStatus);
  const room = useViewRoomStore(selectViewRoom);
  const error = useViewRoomStore(selectViewRoomError);
  const store = () => getViewRoomStore().getState();

  return (
    <Dialog open={roomId !== null} onClose={() => store().closeRoom()} aria-labelledby="view-room-heading" fullWidth maxWidth="sm">
      <DialogTitle id="view-room-heading">Room {roomId}</DialogTitle>
      <DialogContent>
        {status === 'loading' && (
          <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <CircularProgress aria-label="Loading room details" />
            <Typography>Loading room details…</Typography>
          </Box>
        )}

        {status === 'error' && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => roomId && void store().openRoom(roomId)}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {status === 'success' && room && <RoomDetails room={room} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => store().closeRoom()}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
