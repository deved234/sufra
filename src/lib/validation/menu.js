import { z } from "zod";

// Menu editor input, checked on the server. Messages are "Form.errors" keys.

export const BADGES = ["popular", "new"];
export const TAGS = ["spicy", "vegetarian", "serves2", "serves4"];
const MAX_PRICE_SAR = 100000;

const text = (max) => z.string().trim().min(1, "required").max(max, "tooLong");
const localized = (max) => z.object({ ar: text(max), en: text(max) });
export const idSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const categorySchema = z.object({ name: localized(40) });

// "45" or "45.5" riyals become 4500 or 4550 halalas; anything finer is refused
const price = z
  .string()
  .trim()
  .regex(/^\d{1,6}(\.\d{1,2})?$/, "priceInvalid")
  .transform((value) => Math.round(Number(value) * 100))
  .refine((halalas) => halalas >= 1 && halalas <= MAX_PRICE_SAR * 100, "priceInvalid");

export const dishSchema = z.object({
  name: localized(60),
  description: localized(200),
  price,
  badge: z.enum(["", ...BADGES]),
  tags: z.array(z.enum(TAGS)).max(TAGS.length),
  available: z.boolean(),
  categoryId: idSchema,
});

export function readCategoryForm(formData) {
  return { name: { ar: formData.get("name.ar") ?? "", en: formData.get("name.en") ?? "" } };
}

export function readDishForm(formData) {
  return {
    name: { ar: formData.get("name.ar") ?? "", en: formData.get("name.en") ?? "" },
    description: { ar: formData.get("description.ar") ?? "", en: formData.get("description.en") ?? "" },
    price: formData.get("price") ?? "",
    badge: formData.get("badge") ?? "",
    tags: formData.getAll("tags"),
    available: formData.get("available") === "on",
    categoryId: formData.get("categoryId") ?? "",
    photo: formData.get("photo") ?? "",
  };
}

// The stored dish: optional fields left out when empty, as the validator expects
export function toStoredDish(id, { name, description, price, badge, tags, available }, photo) {
  return { id, name, description, priceHalalas: price, ...(badge && { badge }), tags, ...(available ? {} : { available: false }), ...(photo && { photo }) };
}
