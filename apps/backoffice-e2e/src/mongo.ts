import { execFileSync } from 'node:child_process';
import { E2E_DATABASE_URL, hotelInfo, roomInfos } from './fixtures';

function mongosh(script: string): string {
  return execFileSync('mongosh', ['--quiet', E2E_DATABASE_URL, '--eval', script], { encoding: 'utf8' });
}

/** Replaces the e2e database contents with the hotels-schema fixtures (hotel_infos and room_infos). */
export function seedBackoffice() {
  mongosh(`
    db.dropDatabase();
    db.hotel_infos.insertOne({ ...${JSON.stringify(hotelInfo)}, stars: NumberInt(${hotelInfo.stars}), created_at: new Date(), updated_at: new Date() });
    db.room_infos.insertMany(${JSON.stringify(roomInfos)}.map((r) => ({
      ...r,
      number_of_beds: NumberInt(r.number_of_beds),
      price: NumberDecimal(r.price),
    })));
  `);
}

/** The persisted hotel_infos document, without Mongo-specific fields. */
export function storedHotelInfo(hotelId: string): { hotel_id: string; city: string; stars: number; description: string } {
  return JSON.parse(
    mongosh(`
      const h = db.hotel_infos.findOne({ hotel_id: ${JSON.stringify(hotelId)} });
      print(JSON.stringify({ hotel_id: h.hotel_id, city: h.city, stars: h.stars, description: h.description }));
    `).trim(),
  );
}

export function dropBackoffice() {
  mongosh('db.dropDatabase();');
}
