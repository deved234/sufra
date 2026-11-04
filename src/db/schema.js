// $jsonSchema validator for the restaurants collection. MongoDB itself rejects a
// document that doesn't match, so a bug in a future dashboard can't save a broken
// menu. Applied by `npm run db:setup`.

const localized = {
  bsonType: "object",
  required: ["ar", "en"],
  additionalProperties: false,
  properties: {
    ar: { bsonType: "string", minLength: 1 },
    en: { bsonType: "string", minLength: 1 },
  },
};

const key = { bsonType: "string", pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" };
const time = { bsonType: "string", pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$" };

const dish = {
  bsonType: "object",
  required: ["id", "name", "description", "priceHalalas", "tags"],
  additionalProperties: false,
  properties: {
    id: key,
    name: localized,
    description: localized,
    // Whole halalas: 65 SAR is 6500
    priceHalalas: { bsonType: ["int", "long"], minimum: 1 },
    badge: { enum: ["popular", "new"] },
    tags: {
      bsonType: "array",
      uniqueItems: true,
      items: { enum: ["spicy", "vegetarian", "serves2", "serves4"] },
    },
    // "Sold out today". Missing means available, so older dishes need no change
    available: { bsonType: "bool" },
  },
};

const category = {
  bsonType: "object",
  required: ["id", "name", "items"],
  additionalProperties: false,
  properties: {
    id: key,
    name: localized,
    items: { bsonType: "array", items: dish },
  },
};

export const restaurantSchema = {
  bsonType: "object",
  required: ["slug", "name", "tagline", "cuisine", "city", "address", "phone", "hours", "opens", "closes", "accent", "menu"],
  additionalProperties: false,
  properties: {
    _id: { bsonType: "objectId" },
    slug: key,
    name: localized,
    tagline: localized,
    cuisine: localized,
    city: localized,
    address: localized,
    hours: localized,
    phone: { bsonType: "string", pattern: "^\\+[0-9 ]{8,20}$" },
    // Riyadh time; closes may be earlier than opens when the place stays open past midnight
    opens: time,
    closes: time,
    accent: { bsonType: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
    // Display order is array order
    menu: { bsonType: "array", items: category },
    // Users who can edit this restaurant. The demo restaurants have none.
    ownerIds: { bsonType: "array", uniqueItems: true, items: { bsonType: "objectId" } },
    createdAt: { bsonType: "date" },
  },
};

export const userSchema = {
  bsonType: "object",
  // No passwordHash for accounts made with Google, until the owner sets a password
  required: ["email", "name", "createdAt"],
  additionalProperties: false,
  properties: {
    _id: { bsonType: "objectId" },
    // Stored lowercase, so the unique index catches "A@x.com" vs "a@x.com"
    email: { bsonType: "string", pattern: "^[^A-Z\\s@]+@[^A-Z\\s@]+$" },
    name: { bsonType: "string", minLength: 1, maxLength: 80 },
    // scrypt$N$r$p$salt$hash (see src/lib/auth/password.js)
    passwordHash: { bsonType: "string", pattern: "^scrypt\\$" },
    // The Google account's permanent id (the id_token's `sub`), once linked
    googleId: { bsonType: "string", minLength: 1, maxLength: 255 },
    // When the owner opened the confirmation link; null until then
    emailVerifiedAt: { bsonType: ["date", "null"] },
    createdAt: { bsonType: "date" },
  },
};

export const emailTokenSchema = {
  bsonType: "object",
  required: ["_id", "userId", "email", "purpose", "expiresAt", "createdAt"],
  additionalProperties: false,
  properties: {
    // SHA-256 of the token in the link, like sessions
    _id: { bsonType: "string", pattern: "^[0-9a-f]{64}$" },
    userId: { bsonType: "objectId" },
    // The address the link was sent to: it proves that address, not a later one
    email: { bsonType: "string" },
    purpose: { enum: ["verify", "reset"] },
    expiresAt: { bsonType: "date" },
    createdAt: { bsonType: "date" },
  },
};

export const sessionSchema = {
  bsonType: "object",
  required: ["_id", "userId", "expiresAt", "createdAt"],
  additionalProperties: false,
  properties: {
    // SHA-256 of the cookie token: a leaked database holds no usable sessions
    _id: { bsonType: "string", pattern: "^[0-9a-f]{64}$" },
    userId: { bsonType: "objectId" },
    expiresAt: { bsonType: "date" },
    createdAt: { bsonType: "date" },
  },
};

export const loginAttemptSchema = {
  bsonType: "object",
  required: ["_id", "count", "expiresAt"],
  additionalProperties: false,
  properties: {
    _id: { bsonType: "string" }, // the email
    count: { bsonType: "int", minimum: 1 },
    expiresAt: { bsonType: "date" },
  },
};
