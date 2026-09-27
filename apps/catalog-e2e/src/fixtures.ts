/** Isolated database so the journey never reads or changes the MainDatabase development data. */
const MONGO_SERVER_URL = (process.env.CATALOG_E2E_MONGO_URL ?? 'mongodb://localhost:27017').replace(/\/+$/, '');
export const E2E_DATABASE_NAME = 'catalog_e2e';
export const E2E_DATABASE_URL = `${MONGO_SERVER_URL}/${E2E_DATABASE_NAME}`;
export const E2E_API_URL = 'http://localhost:5187';
export const E2E_FRONTEND_URL = 'http://localhost:4273';

export interface FixtureHotel {
  hotel_id: string;
  city: string;
  stars: number;
}

export interface FixtureRoom {
  room_id: string;
  hotel_id: string;
  number_of_beds: number;
  available_from: string;
  available_to: string;
  city: string;
  price: string;
  description: string;
}

export const hotels: FixtureHotel[] = [
  { hotel_id: 'hotel-lisbon-01', city: 'Lisbon', stars: 5 },
  { hotel_id: 'hotel-porto-07', city: 'Porto', stars: 3 },
];

export const rooms: FixtureRoom[] = [
  {
    room_id: 'room-101',
    hotel_id: 'hotel-lisbon-01',
    number_of_beds: 2,
    available_from: '2026-10-01T14:00:00Z',
    available_to: '2026-10-08T11:00:00Z',
    city: 'Lisbon',
    price: '149.99',
    description: 'Double room with a Sea View balcony',
  },
  {
    room_id: 'room-102',
    hotel_id: 'hotel-lisbon-01',
    number_of_beds: 1,
    available_from: '2026-10-03T14:00:00Z',
    available_to: '2026-10-05T11:00:00Z',
    city: 'Lisbon',
    price: '99.00',
    description: 'Courtyard single room',
  },
  {
    room_id: 'room-201',
    hotel_id: 'hotel-porto-07',
    number_of_beds: 4,
    available_from: '2026-12-20T14:00:00Z',
    available_to: '2027-01-02T11:00:00Z',
    city: 'Porto',
    price: '210.00',
    description: 'Family suite, sea view over the Douro mouth',
  },
  {
    room_id: 'room-202',
    hotel_id: 'hotel-porto-07',
    number_of_beds: 2,
    available_from: '2026-11-01T14:00:00Z',
    available_to: '2026-11-04T11:00:00Z',
    city: 'Porto',
    price: '72.50',
    description: 'City view twin by the sea wall',
  },
];

/** Rooms whose description contains the phrase "sea view", in the API's room_id order. */
export const seaViewRooms = rooms.filter((room) => /sea\s+view/i.test(room.description));
