import { execFileSync } from 'node:child_process';
import { E2E_DATABASE_URL, hotels, rooms } from './fixtures';

function mongosh(script: string) {
  execFileSync('mongosh', ['--quiet', E2E_DATABASE_URL, '--eval', script], { stdio: 'inherit' });
}

/** Replaces the e2e database contents with the fixtures, stored with the search ERD's BSON types. */
export function seedCatalog() {
  mongosh(`
    db.dropDatabase();
    db.hotels.createIndex({ hotel_id: 1 }, { name: 'ux_hotels_hotel_id', unique: true });
    db.rooms.createIndex({ room_id: 1 }, { name: 'ux_rooms_room_id', unique: true });
    db.hotels.insertMany(${JSON.stringify(hotels)}.map((h) => ({ ...h, stars: NumberInt(h.stars), created_at: new Date(), updated_at: new Date() })));
    db.rooms.insertMany(${JSON.stringify(rooms)}.map((r) => ({
      ...r,
      number_of_beds: NumberInt(r.number_of_beds),
      available_from: new Date(r.available_from),
      available_to: new Date(r.available_to),
      price: NumberDecimal(r.price),
      created_at: new Date(),
      updated_at: new Date(),
    })));
  `);
}

export function dropCatalog() {
  mongosh('db.dropDatabase();');
}
