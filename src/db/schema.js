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
  },
};
