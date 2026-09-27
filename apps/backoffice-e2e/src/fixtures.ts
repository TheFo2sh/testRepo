/** Isolated database so the journey never reads or changes the MainDatabase development data. */
const MONGO_SERVER_URL = (process.env.BACKOFFICE_E2E_MONGO_URL ?? 'mongodb://localhost:27017').replace(/\/+$/, '');
export const E2E_DATABASE_NAME = 'backoffice_e2e';
export const E2E_DATABASE_URL = `${MONGO_SERVER_URL}/${E2E_DATABASE_NAME}`;
export const E2E_API_URL = 'http://localhost:5287';
export const E2E_FRONTEND_URL = 'http://localhost:4373';

export const hotelInfo = {
  hotel_id: 'H-101',
  city: 'Rotterdam',
  stars: 4,
  description: 'Canal-side boutique hotel',
};

export const roomInfos = [
  { room_id: 'R-1', hotel_id: 'H-101', number_of_beds: 2, price: '120', description: 'Double room' },
  { room_id: 'R-2', hotel_id: 'H-101', number_of_beds: 1, price: '80', description: 'Single room' },
];
