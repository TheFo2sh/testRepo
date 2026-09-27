import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  getSearchRoomsStore,
  selectSearchError,
  selectSearchResults,
  selectSearchStatus,
  selectSearchTotal,
  useSearchRoomsStore,
  type SearchRoomsCriteria,
} from '../state/searchRoomsStore';
import { RoomCard } from './BrowseRoomsScreen';

const ISO_DURATION = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/;

/** Converts a `datetime-local` value (user's local time) to an ISO-8601 UTC date-time. */
export function toIsoDateTime(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const toNumber = (value: string) => (value.trim() === '' || Number.isNaN(Number(value)) ? undefined : Number(value));

export function SearchRoomsScreen() {
  const status = useSearchRoomsStore(selectSearchStatus);
  const results = useSearchRoomsStore(selectSearchResults);
  const total = useSearchRoomsStore(selectSearchTotal);
  const error = useSearchRoomsStore(selectSearchError);
  const text = useSearchRoomsStore((state) => state.criteria.text ?? '');
  const city = useSearchRoomsStore((state) => state.criteria.city ?? '');
  const minStars = useSearchRoomsStore((state) => state.criteria.minStars);

  // Raw input values that may be incomplete while typing; only valid values reach the store.
  const [startAt, setStartAt] = useState('');
  const [duration, setDuration] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const durationInvalid = duration.trim() !== '' && !ISO_DURATION.test(duration.trim());
  const store = () => getSearchRoomsStore().getState();
  const apply = (criteria: Partial<SearchRoomsCriteria>) => store().setCriteria(criteria);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void store().search();
  };

  return (
    <Box component="section" aria-labelledby="search-rooms-heading" sx={{ p: { xs: 2, md: 4 } }}>
      <Typography id="search-rooms-heading" variant="h4" component="h2" gutterBottom>
        Search rooms
      </Typography>

      <Box component="form" role="search" aria-label="Search rooms" onSubmit={onSubmit} noValidate sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Search text"
              placeholder="e.g. sea view"
              value={text}
              onChange={(event) => store().setText(event.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="City"
              value={city}
              onChange={(event) => apply({ city: event.target.value || undefined })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              select
              fullWidth
              label="Minimum stars"
              value={minStars === undefined ? '' : String(minStars)}
              onChange={(event) => apply({ minStars: toNumber(event.target.value) })}
            >
              <MenuItem value="">Any</MenuItem>
              {[1, 2, 3, 4, 5].map((stars) => (
                <MenuItem key={stars} value={String(stars)}>
                  {stars}+
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              type="datetime-local"
              label="Start at"
              value={startAt}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(event) => {
                setStartAt(event.target.value);
                apply({ startAt: toIsoDateTime(event.target.value) });
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Duration"
              placeholder="e.g. P3D"
              value={duration}
              error={durationInvalid}
              helperText={durationInvalid ? 'Use an ISO-8601 duration such as P3D.' : 'ISO-8601, e.g. P3D'}
              onChange={(event) => {
                const value = event.target.value;
                setDuration(value);
                const trimmed = value.trim();
                if (trimmed === '') apply({ duration: undefined });
                else if (ISO_DURATION.test(trimmed)) apply({ duration: trimmed });
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Min price"
              value={minPrice}
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              onChange={(event) => {
                setMinPrice(event.target.value);
                apply({ minPrice: toNumber(event.target.value) });
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Max price"
              value={maxPrice}
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              onChange={(event) => {
                setMaxPrice(event.target.value);
                apply({ maxPrice: toNumber(event.target.value) });
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', alignItems: 'flex-start' }}>
            <Button type="submit" variant="contained" size="large" fullWidth sx={{ height: 56 }}>
              Search
            </Button>
          </Grid>
        </Grid>
      </Box>

      {status === 'idle' && (
        <Typography color="text.secondary">Enter search criteria to find rooms.</Typography>
      )}

      {status === 'loading' && (
        <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress aria-label="Searching rooms" />
          <Typography>Searching rooms…</Typography>
        </Box>
      )}

      {status === 'error' && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void store().search()}>
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
            {total === 1 ? '1 room found' : `${total} rooms found`}
          </Typography>
          {results.length === 0 ? (
            <Alert severity="info">No rooms match your search.</Alert>
          ) : (
            <Grid container spacing={2} component="ul" aria-label="Search results" sx={{ listStyle: 'none', p: 0, m: 0 }}>
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
