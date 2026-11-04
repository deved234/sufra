// Creates the collections with their validators and indexes.
// Safe to run again: existing collections get the current validator.
// Run: npm run db:setup (reads MONGODB_URI from .env.local)
import { MongoClient } from "mongodb";
import { DB_NAME, EMAIL_TOKENS, LOGIN_ATTEMPTS, RESTAURANTS, SESSIONS, USERS } from "../src/db/config.js";
import { emailTokenSchema, loginAttemptSchema, restaurantSchema, sessionSchema, userSchema } from "../src/db/schema.js";

const collections = [
  {
    name: RESTAURANTS,
    schema: restaurantSchema,
    indexes: [
      [{ slug: 1 }, { unique: true, name: "slug_unique" }],
      [{ ownerIds: 1 }, { name: "owner" }],
    ],
  },
  {
    name: USERS,
    schema: userSchema,
    indexes: [
      [{ email: 1 }, { unique: true, name: "email_unique" }],
      // Partial: unique among accounts that have a googleId, ignoring the rest
      [{ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $exists: true } }, name: "google_unique" }],
    ],
  },
  {
    name: SESSIONS,
    schema: sessionSchema,
    indexes: [
      // TTL: MongoDB deletes each session by itself once expiresAt has passed
      [{ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expires" }],
      [{ userId: 1 }, { name: "user" }],
    ],
  },
  {
    name: LOGIN_ATTEMPTS,
    schema: loginAttemptSchema,
    indexes: [[{ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expires" }]],
  },
  {
    name: EMAIL_TOKENS,
    schema: emailTokenSchema,
    indexes: [
      [{ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expires" }],
      [{ userId: 1, purpose: 1 }, { name: "user_purpose" }],
    ],
  },
];

const client = new MongoClient(process.env.MONGODB_URI, { appName: "sufra-scripts" });

try {
  const db = client.db(DB_NAME);
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));

  for (const { name, schema, indexes } of collections) {
    const options = { validator: { $jsonSchema: schema }, validationLevel: "strict", validationAction: "error" };
    if (existing.has(name)) {
      await db.command({ collMod: name, ...options });
      console.log(`Updated the validator on ${DB_NAME}.${name}`);
    } else {
      await db.createCollection(name, options);
      console.log(`Created ${DB_NAME}.${name} with its validator`);
    }
    for (const [keys, indexOptions] of indexes) await db.collection(name).createIndex(keys, indexOptions);
    console.log(`  indexes: ${indexes.map(([, o]) => o.name).join(", ")}`);
  }

  // Accounts made before email confirmation existed count as confirmed when they
  // were created, so their owners aren't locked out. New accounts start with null.
  const { modifiedCount } = await db
    .collection(USERS)
    .updateMany({ emailVerifiedAt: { $exists: false } }, [{ $set: { emailVerifiedAt: "$createdAt" } }]);
  if (modifiedCount) console.log(`Marked ${modifiedCount} older account(s) as confirmed`);
} finally {
  await client.close();
}
