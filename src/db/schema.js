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

// A photo stored on Cloudinary. blur is a tiny preview, shown while it loads.
const photo = {
  bsonType: "object",
  required: ["id", "width", "height"],
  additionalProperties: false,
  properties: {
    id: { bsonType: "string", pattern: "^sufra/[a-z0-9-]+/[a-f0-9]{24}$" },
    width: { bsonType: "int", minimum: 1 },
    height: { bsonType: "int", minimum: 1 },
    blur: { bsonType: "string", maxLength: 1500 },
  },
};

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
    photo,
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

// A page's blocks. Each block's own settings are checked against the list of blocks by
// src/lib/validation/site.js before saving; here, only the shape they all share.
const siteBlocks = {
  bsonType: "array",
  maxItems: 30,
  items: {
    bsonType: "object",
    required: ["id", "type", "variant", "props"],
    additionalProperties: false,
    properties: {
      id: key,
      type: { enum: ["hero", "menu", "featured", "about", "gallery", "hours", "booking", "contact", "announcement"] },
      variant: { bsonType: "string", maxLength: 20 },
      props: { bsonType: "object" },
    },
  },
};

// What an owner is working on, apart from the restaurant, so it can never reach a
// public page. rev guards against two tabs saving over each other.
export const siteDraftSchema = {
  bsonType: "object",
  required: ["restaurantId", "blocks", "rev", "updatedAt"],
  additionalProperties: false,
  properties: {
    _id: { bsonType: "objectId" },
    restaurantId: { bsonType: "objectId" },
    blocks: siteBlocks,
    rev: { bsonType: ["int", "long"], minimum: 0 },
    updatedAt: { bsonType: "date" },
    updatedBy: { bsonType: "objectId" },
  },
};

// The last few published pages, to go back to
export const siteVersionSchema = {
  bsonType: "object",
  required: ["restaurantId", "version", "blocks", "publishedAt"],
  additionalProperties: false,
  properties: {
    _id: { bsonType: "objectId" },
    restaurantId: { bsonType: "objectId" },
    version: { bsonType: ["int", "long"], minimum: 1 },
    blocks: siteBlocks,
    publishedAt: { bsonType: "date" },
    publishedBy: { bsonType: "objectId" },
  },
};

export const restaurantSchema = {
  bsonType: "object",
  required: ["slug", "name", "tagline", "cuisine", "city", "address", "phone", "opens", "closes", "accent", "menu"],
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
    // Who can see it. Missing means published. A deleted one stays in the database so
    // its address can't be taken and customers keep their booking history.
    status: { enum: ["draft", "published", "hidden", "suspended", "deleted"] },
    // Set by an admin. The status to go back to, why, and whether it stopped with its
    // owner's account, so lifting that restores only what it stopped
    statusBeforeSuspension: { enum: ["draft", "published", "hidden"] },
    suspendedReason: { bsonType: "string", maxLength: 200 },
    suspendedByAccount: { bsonType: "bool" },
    deletedAt: { bsonType: "date" },
    // Riyadh time; closes may be earlier than opens when the place stays open past midnight.
    // The real hours are weeklyHours. These two are the first open day's, kept for
    // anything that predates weekly hours.
    opens: time,
    closes: time,
    // Sunday first. No periods means closed that day.
    weeklyHours: {
      bsonType: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        bsonType: "object",
        required: ["periods"],
        additionalProperties: false,
        properties: {
          periods: {
            bsonType: "array",
            maxItems: 2,
            items: {
              bsonType: "object",
              required: ["opens", "closes"],
              additionalProperties: false,
              properties: { opens: time, closes: time },
            },
          },
        },
      },
    },
    // Date ranges that replace the weekly hours: holidays, days without bookings, Ramadan
    exceptions: {
      bsonType: "array",
      maxItems: 30,
      items: {
        bsonType: "object",
        required: ["id", "from", "to", "type"],
        additionalProperties: false,
        properties: {
          id: { bsonType: "string" },
          from: { bsonType: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
          to: { bsonType: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
          type: { enum: ["closed", "noBooking", "hours"] },
          opens: time,
          closes: time,
          note: { bsonType: "string", maxLength: 80 },
        },
      },
    },
    accent: { bsonType: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
    cover: photo,
    logo: photo,
    // The published page. Missing means the default page, so older restaurants need no change
    site: {
      bsonType: "object",
      required: ["blocks", "version", "publishedAt"],
      additionalProperties: false,
      properties: {
        blocks: siteBlocks,
        version: { bsonType: ["int", "long"], minimum: 1 },
        publishedAt: { bsonType: "date" },
      },
    },
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
    // A temporary account's sample restaurant: when it goes, and whose dish photos it shows
    demoExpiresAt: { bsonType: "date" },
    photosFrom: { bsonType: "string" },
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
    // Only "admin" exists. Set by scripts/make-admin.mjs, never from the site.
    role: { enum: ["admin"] },
    suspendedAt: { bsonType: "date" },
    suspendedReason: { bsonType: "string", maxLength: 200 },
    // The Google account's permanent id (the id_token's `sub`), once linked
    googleId: { bsonType: "string", minLength: 1, maxLength: 255 },
    // From the customer's last booking or their account page, to fill in the next one
    phone: { bsonType: "string" },
    favoriteRestaurantIds: { bsonType: "array", maxItems: 200, uniqueItems: true, items: { bsonType: "objectId" } },
    favoriteDishes: {
      bsonType: "array",
      maxItems: 300,
      uniqueItems: true,
      items: {
        bsonType: "object",
        required: ["restaurantId", "dishId"],
        additionalProperties: false,
        properties: { restaurantId: { bsonType: "objectId" }, dishId: { bsonType: "string" } },
      },
    },
    // When the owner opened the confirmation link; null until then
    emailVerifiedAt: { bsonType: ["date", "null"] },
    createdAt: { bsonType: "date" },
    // A temporary account from "try without an account" (src/lib/demo)
    demoExpiresAt: { bsonType: "date" },
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
    purpose: { enum: ["verify", "reset", "changeEmail"] },
    // For changeEmail: the address being moved to, which the link is proving
    newEmail: { bsonType: "string" },
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
    // The half hours it gave back on finishing or not showing up. Missing means none.
    releasedSlots: { bsonType: "array", items: dayTime },
    // Why the restaurant cancelled it, for the customer. Optional.
    cancelReason: { bsonType: "string", maxLength: 200 },
    code: { bsonType: "string" },
    // The customer's language, for emails sent later
    locale: { enum: ["ar", "en"] },
    // The last time the customer did something the owner should notice
    customerActionAt: { bsonType: "date" },
    // When the reminder for its current time was taken for sending. Moving it to
    // another time removes this, so the new time gets its own reminder.
    reminderSentAt: { bsonType: "date" },
    // A change one side asked for, waiting for the other. Seats aren't held for it:
    // nobody may answer, so room is checked on acceptance.
    proposal: {
      bsonType: "object",
      required: ["date", "time", "slots", "startsAt", "party", "reason", "expiresAt", "createdAt"],
      additionalProperties: false,
      properties: {
        // Who is asking. Missing means the owner, for proposals older than this field
        by: { enum: ["owner", "customer"] },
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
        by: { enum: ["owner", "customer"] },
        date: { bsonType: "string" },
        time: dayTime,
        party: { bsonType: ["int", "long"] },
        decidedAt: { bsonType: "date" },
      },
    },
    editedAt: { bsonType: "date" },
    createdAt: { bsonType: "date" },
    updatedAt: { bsonType: "date" },
    demoExpiresAt: { bsonType: "date" },
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

export const adminLogSchema = {
  bsonType: "object",
  required: ["actorId", "actorEmail", "action", "targetType", "targetId", "targetLabel", "at"],
  additionalProperties: false,
  properties: {
    _id: { bsonType: "objectId" },
    actorId: { bsonType: "objectId" },
    actorEmail: { bsonType: "string" },
    action: { bsonType: "string" },
    targetType: { enum: ["restaurant", "user"] },
    targetId: { bsonType: "string" },
    targetLabel: { bsonType: "string" },
    detail: { bsonType: "string" },
    at: { bsonType: "date" },
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
