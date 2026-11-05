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
    // Table booking. Missing means off, so older restaurants need no change
    booking: {
      bsonType: "object",
      required: ["enabled", "capacity", "durationMinutes", "maxParty"],
      additionalProperties: false,
      properties: {
        enabled: { bsonType: "bool" },
        // Seats that can be taken at the same time
        capacity: { bsonType: ["int", "long"], minimum: 1 },
        durationMinutes: { bsonType: ["int", "long"], minimum: 30 },
        maxParty: { bsonType: ["int", "long"], minimum: 1 },
      },
    },
    // When the owner last opened the bookings page, for the "new" counts
    bookingsSeenAt: { bsonType: "date" },
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
    // From the customer's last booking, to fill in the next one
    phone: { bsonType: "string" },
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

const dayTime = { bsonType: "string", pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$" };

export const bookingSchema = {
  bsonType: "object",
  required: ["restaurantId", "source", "date", "time", "slots", "startsAt", "party", "name", "phone", "status", "code", "locale", "createdAt", "updatedAt"],
  additionalProperties: false,
  properties: {
    _id: { bsonType: "objectId" },
    restaurantId: { bsonType: "objectId" },
    // The customer's account; null for a booking the owner took over the phone
    userId: { bsonType: ["objectId", "null"] },
    source: { enum: ["online", "owner"] },
    // The service day: 00:30 on a night that began on the 10th has the date of the 10th
    date: { bsonType: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
    time: dayTime,
    // The half hours holding its seats. Kept, so cancelling returns exactly what was
    // taken even if the owner has changed the booking length since.
    slots: { bsonType: "array", minItems: 1, items: dayTime },
    startsAt: { bsonType: "date" },
    party: { bsonType: ["int", "long"], minimum: 1 },
    name: { bsonType: "string", minLength: 1, maxLength: 80 },
    email: { bsonType: ["string", "null"] },
    phone: { bsonType: "string" },
    note: { bsonType: "string", maxLength: 200 },
    status: { enum: ["confirmed", "seated", "completed", "noShow", "cancelled"] },
    code: { bsonType: "string" },
    // The customer's language, for emails sent later
    locale: { enum: ["ar", "en"] },
    // The last time the customer did something the owner should notice
    customerActionAt: { bsonType: "date" },
    // A change the owner proposed, waiting for the customer. Seats aren't held for it:
    // nobody may answer, so room is checked when the customer accepts.
    proposal: {
      bsonType: "object",
      required: ["date", "time", "slots", "startsAt", "party", "reason", "expiresAt", "createdAt"],
      additionalProperties: false,
      properties: {
        date: { bsonType: "string" },
        time: dayTime,
        slots: { bsonType: "array", minItems: 1, items: dayTime },
        startsAt: { bsonType: "date" },
        party: { bsonType: ["int", "long"], minimum: 1 },
        reason: { bsonType: "string", minLength: 1, maxLength: 200 },
        // Whichever comes first, the old time or the new one: after that it's pointless
        expiresAt: { bsonType: "date" },
        createdAt: { bsonType: "date" },
      },
    },
    // How the last proposal ended, for the owner
    lastProposal: {
      bsonType: "object",
      required: ["outcome", "date", "time", "party", "decidedAt"],
      additionalProperties: false,
      properties: {
        outcome: { enum: ["accepted", "declined"] },
        date: { bsonType: "string" },
        time: dayTime,
        party: { bsonType: ["int", "long"] },
        decidedAt: { bsonType: "date" },
      },
    },
    editedAt: { bsonType: "date" },
    createdAt: { bsonType: "date" },
    updatedAt: { bsonType: "date" },
  },
};

export const bookingDaySchema = {
  bsonType: "object",
  required: ["restaurantId", "date", "seats", "expiresAt"],
  additionalProperties: false,
  properties: {
    // "<restaurantId>:<date>", so one restaurant has exactly one document per day
    _id: { bsonType: "string" },
    restaurantId: { bsonType: "objectId" },
    date: { bsonType: "string" },
    // Seats taken per half hour: { "19:00": 12, "19:30": 12 }
    seats: {
      bsonType: "object",
      additionalProperties: false,
      patternProperties: { "^([01][0-9]|2[0-3]):[0-5][0-9]$": { bsonType: "int", minimum: 0 } },
    },
    expiresAt: { bsonType: "date" },
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
