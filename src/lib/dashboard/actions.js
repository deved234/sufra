"use server";

import { ObjectId } from "mongodb";
import { updateTag } from "next/cache";
import { getDb } from "@/db/client";
import { RESTAURANTS } from "@/db/config";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getActionUser } from "@/lib/auth/dal";
import { buildRestaurantTheme, themeStyle } from "@/lib/restaurant-theme";
import { fieldErrors } from "@/lib/validation/auth";
import { idSchema } from "@/lib/validation/menu";
import { newRestaurantSchema, readRestaurantForm, restaurantDetailsSchema } from "@/lib/validation/restaurant";

// Enough for a real owner, and a cap on spam accounts filling the site
const MAX_RESTAURANTS_PER_USER = 5;

// Each action checks the session itself. The proxy and the page guards only
// decide what to show; a Server Action is a public endpoint anyone can call.

function formLocale(formData) {
  const locale = formData.get("locale");
  return routing.locales.includes(locale) ? locale : routing.defaultLocale;
}

export async function createRestaurant(_previous, formData) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };

  const values = readRestaurantForm(formData);
  const parsed = newRestaurantSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const owned = await getDb().collection(RESTAURANTS).countDocuments({ ownerIds: new ObjectId(user.id) });
  if (owned >= MAX_RESTAURANTS_PER_USER) return { values, error: "tooMany" };

  try {
    await getDb()
      .collection(RESTAURANTS)
      .insertOne({ ...parsed.data, menu: [], ownerIds: [new ObjectId(user.id)], createdAt: new Date() });
  } catch (error) {
    // The unique index on slug is the real guard against two owners picking the same address
    if (error.code === 11000) return { values, errors: { slug: "slugTaken" } };
    throw error;
  }

  // The list of restaurants changed, and so did this address: a visit before it
  // existed cached "not found" under its own tag
  updateTag("restaurants");
  updateTag(`restaurant:${parsed.data.slug}`);
  redirect({ href: `/dashboard/${parsed.data.slug}`, locale: formLocale(formData) });
}

export async function updateRestaurant(slug, _previous, formData) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  // The slug comes back from the browser: only a plain address, never a query object
  if (!idSchema.safeParse(slug).success) return { error: "notFound" };

  const values = readRestaurantForm(formData);
  const parsed = restaurantDetailsSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  // Matching on the owner too: another user's slug simply matches nothing
  const { matchedCount } = await getDb()
    .collection(RESTAURANTS)
    .updateOne({ slug, ownerIds: new ObjectId(user.id) }, { $set: parsed.data });
  if (matchedCount === 0) return { values, error: "notFound" };

  // The restaurant's public pages show the change on their next visit
  updateTag(`restaurant:${slug}`);
  return { values: { ...values, ...parsed.data }, saved: Date.now() };
}

// Live preview while picking a color. The theme builder (culori) stays on the
// server, so only the resulting CSS variables travel to the browser.
export async function previewTheme(accent) {
  if (typeof accent !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(accent)) return null;
  return themeStyle(buildRestaurantTheme(accent));
}
