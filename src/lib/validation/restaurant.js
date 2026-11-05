import { z } from "zod";

// The restaurant form, checked on the server. Messages are "Form.errors" keys.
// MongoDB's own validator (src/db/schema.js) checks the stored shape again.

// Paths in the app that a restaurant address must not shadow
const RESERVED = ["account", "favorites", "ar", "en", "r", "api", "bookings", "dashboard", "explore", "new", "settings", "sign-in", "sign-up", "styleguide"];

const text = (max) => z.string().trim().min(1, "required").max(max, "tooLong");
const localized = (max) => z.object({ ar: text(max), en: text(max) });
const time = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "timeInvalid");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slugFormat")
  .min(3, "slugFormat")
  .max(40, "slugFormat")
  .refine((slug) => !RESERVED.includes(slug), "slugReserved");

// Everything but the address, which can't change after creation
export const restaurantDetailsSchema = z.object({
  name: localized(60),
  tagline: localized(160),
  cuisine: localized(40),
  city: localized(40),
  address: localized(120),
  hours: localized(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+[0-9 ]{8,20}$/, "phoneInvalid"),
  opens: time,
  closes: time,
  accent: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "colorInvalid")
    .transform((hex) => hex.toUpperCase()),
});

export const newRestaurantSchema = restaurantDetailsSchema.extend({ slug: slugSchema });

// FormData fields named "name.ar", "name.en"... become { name: { ar, en } }
export const LOCALIZED_FIELDS = ["name", "tagline", "cuisine", "city", "address", "hours"];
const PLAIN_FIELDS = ["slug", "phone", "opens", "closes", "accent"];

export function readRestaurantForm(formData) {
  const values = {};
  for (const field of LOCALIZED_FIELDS) {
    values[field] = { ar: formData.get(`${field}.ar`) ?? "", en: formData.get(`${field}.en`) ?? "" };
  }
  for (const field of PLAIN_FIELDS) values[field] = formData.get(field) ?? "";
  return values;
}
