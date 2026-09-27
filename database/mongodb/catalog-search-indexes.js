// Idempotent index migration for the MainDatabase › search read model (see search-schema.mmd).
// createIndex is a no-op when an index with the same name and definition already exists.
//
// Usage: mongosh "mongodb://localhost:27017/testdb" database/mongodb/catalog-search-indexes.js

const catalog = db.getSiblingDB('testdb');

catalog.hotels.createIndex(
  { hotel_id: 1 },
  { name: 'ux_hotels_hotel_id', unique: true }
);

catalog.rooms.createIndex(
  { room_id: 1 },
  { name: 'ux_rooms_room_id', unique: true }
);

catalog.rooms.createIndex(
  { hotel_id: 1, city: 1, price: 1, available_from: 1, available_to: 1 },
  { name: 'ix_rooms_search_filters' }
);

catalog.rooms.createIndex(
  { description: 'text' },
  { name: 'ix_rooms_description_text' }
);
