// Migration for the logical MainDatabase › search model (see search-schema.mmd).
// Realizes the `hotels` and `rooms` entities as collections in the `testdb` database.
// Idempotent: creates missing collections, reconfigures existing ones with collMod,
// and creates named indexes so reruns converge.
//
// Usage: mongosh "mongodb://localhost:27017/testdb" database/mongodb/search-schema.mongosh.js
//
// Legacy rooms without a string `description` are backfilled with an empty string before the
// validator is applied, so every stored room can be emitted as a Room (whose description is a
// required string). An empty description marks a room with no catalog text yet; such rooms are
// not text-searchable and are reported by audit-room-descriptions.js.
//
// Note: rooms.hotel_id is required and indexed, but MongoDB cannot enforce that the
// referenced hotel exists. Referential existence is a write-path responsibility.

const EXPECTED_DB = "testdb";

if (db.getName() !== EXPECTED_DB) {
  throw new Error(
    `search-schema migration must run against '${EXPECTED_DB}', but the selected database is '${db.getName()}'.`
  );
}

const collections = {
  hotels: {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["hotel_id", "city", "stars", "created_at", "updated_at"],
        additionalProperties: false,
        properties: {
          _id: { bsonType: "objectId" },
          hotel_id: { bsonType: "string", description: "Logical primary key" },
          city: { bsonType: "string" },
          stars: { bsonType: "int" },
          created_at: { bsonType: "date" },
          updated_at: { bsonType: "date" },
        },
      },
    },
    indexes: [{ key: { hotel_id: 1 }, name: "ux_hotels_hotel_id", unique: true }],
  },
  rooms: {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "room_id",
          "hotel_id",
          "number_of_beds",
          "available_from",
          "available_to",
          "city",
          "price",
          "description",
          "created_at",
          "updated_at",
        ],
        additionalProperties: false,
        properties: {
          _id: { bsonType: "objectId" },
          room_id: { bsonType: "string", description: "Logical primary key" },
          hotel_id: { bsonType: "string", description: "Reference to hotels.hotel_id (not enforced)" },
          number_of_beds: { bsonType: "int" },
          available_from: { bsonType: "date" },
          available_to: { bsonType: "date" },
          city: { bsonType: "string" },
          price: { bsonType: "decimal" },
          description: {
            bsonType: "string",
            description: "Room description shown to users and used for text search; empty when the catalog has none",
          },
          created_at: { bsonType: "date" },
          updated_at: { bsonType: "date" },
        },
      },
    },
    indexes: [
      { key: { room_id: 1 }, name: "ux_rooms_room_id", unique: true },
      { key: { hotel_id: 1 }, name: "ix_rooms_hotel_id" },
    ],
  },
};

const existing = new Set(db.getCollectionNames());

if (existing.has("rooms")) {
  const backfill = db.rooms.updateMany(
    { description: { $not: { $type: "string" } } },
    [{ $set: { description: "", updated_at: "$$NOW" } }]
  );
  print(`Backfilled description on ${backfill.modifiedCount} legacy room(s)`);
}

for (const [name, spec] of Object.entries(collections)) {
  const options = {
    validator: spec.validator,
    validationLevel: "strict",
    validationAction: "error",
  };

  if (existing.has(name)) {
    const result = db.runCommand({ collMod: name, ...options });
    if (result.ok !== 1) {
      throw new Error(`collMod ${name} failed: ${JSON.stringify(result)}`);
    }
    print(`Reconfigured collection ${name}`);
  } else {
    db.createCollection(name, options);
    print(`Created collection ${name}`);
  }

  const collection = db.getCollection(name);
  for (const { key, ...indexOptions } of spec.indexes) {
    // Drop an index on the same key under a different name so reruns converge on the expected names.
    for (const index of collection.getIndexes()) {
      if (index.name !== indexOptions.name && JSON.stringify(index.key) === JSON.stringify(key)) {
        collection.dropIndex(index.name);
        print(`Dropped index ${index.name} on ${name}`);
      }
    }
    collection.createIndex(key, indexOptions);
    print(`Ensured index ${indexOptions.name} on ${name}`);
  }
}
