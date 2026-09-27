// Read-only audit: reports rooms without an authoritative, non-empty `description`.
// Such rooms cannot match text search; fix them at the source rather than inventing values.
//
// Usage: mongosh "mongodb://localhost:27017/testdb" database/mongodb/audit-room-descriptions.js

const catalog = db.getSiblingDB('testdb');

const total = catalog.rooms.countDocuments({});
const missing = catalog.rooms
  .find(
    {
      $or: [
        { description: { $exists: false } },
        { description: { $not: { $type: 'string' } } },
        { description: { $regex: /^\s*$/ } },
      ],
    },
    { _id: 0, room_id: 1 }
  )
  .toArray();

print(`rooms: ${total}, with description: ${total - missing.length}, missing description: ${missing.length}`);
for (const room of missing) {
  print(`  missing description: ${room.room_id}`);
}
