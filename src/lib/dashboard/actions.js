"use server";

import { ObjectId } from "mongodb";
import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { getDb } from "@/db/client";
import { BOOKING_DAYS, BOOKINGS, RESTAURANTS } from "@/db/config";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auditRestaurantEdit } from "@/lib/admin/log";
import { getActionUser } from "@/lib/auth/dal";
import { manageFilter } from "@/lib/dashboard/access";
import { sendRestaurantClosed } from "@/lib/auth/emails";
import { everyDay } from "@/lib/opening-hours";
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

  const owned = await getDb().collection(RESTAURANTS).countDocuments({ ownerIds: new ObjectId(user.id), status: { $ne: "deleted" } });
  if (owned >= MAX_RESTAURANTS_PER_USER) return { values, error: "tooMany" };

  try {
    await getDb()
      .collection(RESTAURANTS)
      // A draft until its owner publishes it. Weekly hours start the same every day.
      .insertOne({ ...parsed.data, status: "draft", weeklyHours: everyDay(parsed.data.opens, parsed.data.closes), menu: [], ownerIds: [new ObjectId(user.id)], createdAt: new Date() });
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
    .updateOne(manageFilter(user, slug), { $set: parsed.data });
  if (matchedCount === 0) return { values, error: "notFound" };
  await auditRestaurantEdit(user, slug, "restaurantEdited");

  // The restaurant's public pages and its card in the lists show the change next visit
  updateTag(`restaurant:${slug}`);
  updateTag("restaurants");
  return { values: { ...values, ...parsed.data }, saved: Date.now() };
}

// Publishing needs something to show. Hiding leaves bookings as they are, and only
// stops new ones, because hiding can be temporary.
export async function setRestaurantStatus(slug, status) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success || !["published", "hidden"].includes(status)) return { error: "stale" };

  // A suspended restaurant waits for an admin, through the admin panel
  const owned = { ...manageFilter(user, slug), status: { $nin: ["deleted", "suspended"] } };
  const restaurants = getDb().collection(RESTAURANTS);
  const { matchedCount } = await restaurants.updateOne(status === "published" ? { ...owned, "menu.items.0": { $exists: true } } : owned, { $set: { status } });
  if (!matchedCount) {
    if (await restaurants.countDocuments(owned)) return { error: "publishNeedsDish" };
    return { error: (await restaurants.countDocuments(manageFilter(user, slug))) ? "restaurantSuspended" : "notFound" };
  }
  await auditRestaurantEdit(user, slug, status === "published" ? "restaurantPublished" : "restaurantHidden");

  updateTag(`restaurant:${slug}`);
  updateTag("restaurants");
  refresh();
  return { ok: true };
}

// Gone for everyone, but kept: its address can't be taken by someone else, and
// customers keep their history. Coming bookings are cancelled and the customers told.
export async function deleteRestaurant(slug, _previous, formData) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success) return { error: "notFound" };
  if (String(formData.get("confirm") ?? "").trim() !== slug) return { errors: { confirm: "slugMismatch" } };

  const db = getDb();
  const restaurant = await db
    .collection(RESTAURANTS)
    .findOneAndUpdate(manageFilter(user, slug), { $set: { status: "deleted", deletedAt: new Date() } }, { projection: { name: 1, slug: 1 } });
  if (!restaurant) return { error: "notFound" };
  await auditRestaurantEdit(user, slug, "restaurantDeleted");

  const bookings = db.collection(BOOKINGS);
  const coming = await bookings.find({ restaurantId: restaurant._id, status: "confirmed", startsAt: { $gt: new Date() } }).toArray();
  await bookings.updateMany(
    { _id: { $in: coming.map((booking) => booking._id) } },
    { $set: { status: "cancelled", updatedAt: new Date() }, $unset: { proposal: "" } },
  );
  await db.collection(BOOKING_DAYS).deleteMany({ restaurantId: restaurant._id });
  for (const booking of coming) {
    if (booking.email) after(() => sendRestaurantClosed(booking, restaurant));
  }

  updateTag(`restaurant:${slug}`);
  updateTag("restaurants");
  redirect({ href: "/dashboard", locale: formLocale(formData) });
}

// Live preview while picking a color. The theme builder (culori) stays on the
// server, so only the resulting CSS variables travel to the browser.
export async function previewTheme(accent) {
  if (typeof accent !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(accent)) return null;
  return themeStyle(buildRestaurantTheme(accent));
}
