import "server-only";
import { z } from "zod";
import { getPhoto } from "@/lib/photos/cloudinary";

// A photo as the browser reports it, from a form field holding JSON
const reported = z.object({
  id: z.string().max(200),
  // The small blurred preview, made in the browser. It ends up in a style attribute, so
  // only this exact shape gets through, and the size is capped: it's stored on the dish.
  blur: z.string().max(1500).regex(/^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/),
});

// Photos live in a folder per restaurant, under a name the server chose
export const photoFolder = (slug) => `sufra/${slug}`;
const belongsTo = (id, slug) => new RegExp(`^${photoFolder(slug)}/[a-f0-9]{24}$`).test(id);

// Turns what a browser reported into what gets stored, or says why it can't.
// raw: the field's text; empty means no photo.
export async function verifyPhoto(slug, raw) {
  if (!raw) return { photo: null };
  let parsed;
  try {
    parsed = reported.safeParse(JSON.parse(raw));
  } catch {
    return { error: "photoInvalid" };
  }
  // Another restaurant's photo, or any other address, stops here
  if (!parsed.success || !belongsTo(parsed.data.id, slug)) return { error: "photoInvalid" };

  try {
    const size = await getPhoto(parsed.data.id);
    if (!size) return { error: "photoInvalid" };
    return { photo: { id: parsed.data.id, ...size, blur: parsed.data.blur } };
  } catch (error) {
    console.error("[photos] couldn't check a photo:", error);
    return { error: "photoFailed" };
  }
}

export const photoIds = (menu) => menu.flatMap((category) => category.items.flatMap((dish) => (dish.photo ? [dish.photo.id] : [])));
