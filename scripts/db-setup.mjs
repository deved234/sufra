// Creates the restaurants collection with its validator and indexes.
// Safe to run again: an existing collection gets the current validator.
// Run: npm run db:setup (reads MONGODB_URI from .env.local)
import { MongoClient } from "mongodb";
import { DB_NAME, RESTAURANTS } from "../src/db/config.js";
import { restaurantSchema } from "../src/db/schema.js";

const client = new MongoClient(process.env.MONGODB_URI, { appName: "sufra-scripts" });

try {
  const db = client.db(DB_NAME);
  const validator = { $jsonSchema: restaurantSchema };
  const exists = (await db.listCollections({ name: RESTAURANTS }).toArray()).length > 0;

  if (exists) {
    await db.command({ collMod: RESTAURANTS, validator, validationLevel: "strict", validationAction: "error" });
    console.log(`Updated the validator on ${DB_NAME}.${RESTAURANTS}`);
  } else {
    await db.createCollection(RESTAURANTS, { validator, validationLevel: "strict", validationAction: "error" });
    console.log(`Created ${DB_NAME}.${RESTAURANTS} with its validator`);
  }

  await db.collection(RESTAURANTS).createIndex({ slug: 1 }, { unique: true, name: "slug_unique" });
  console.log("Index slug_unique is in place");
} finally {
  await client.close();
}
