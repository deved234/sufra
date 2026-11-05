"use server";

import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { refresh, updateTag } from "next/cache";
import { getDb } from "@/db/client";
import { BOOKINGS, RESTAURANTS } from "@/db/config";
import { getActionUser } from "@/lib/auth/dal";
import { daySlots, SLOT_MINUTES } from "@/lib/booking-slots";
import { periodsForDate, riyadhDate } from "@/lib/opening-hours";
import { fieldErrors } from "@/lib/validation/auth";
import { idSchema } from "@/lib/validation/menu";
import { exceptionSchema, readExceptionForm, readWeeklyHours } from "@/lib/validation/schedule";

const MAX_EXCEPTIONS = 30;

const restaurants = () => getDb().collection(RESTAURANTS);
const owned = (slug, user) => ({ slug, ownerIds: new ObjectId(user.id), status: { $ne: "deleted" } });

function refreshPublic(slug) {
  updateTag(`restaurant:${slug}`);
  updateTag("restaurants");
  refresh();
}

// Coming bookings the new hours no longer cover. They're never cancelled by this: the
// owner decides, so they get the list.
async function outsideHours(restaurantId, schedule) {
  const coming = await getDb()
    .collection(BOOKINGS)
    .find({ restaurantId, status: "confirmed", startsAt: { $gt: new Date() } }, { projection: { date: 1, time: 1, name: 1, slots: 1 } })
    .sort({ startsAt: 1 })
    .limit(200)
    .toArray();
  return coming
    .filter(({ date, time, slots }) => !daySlots(periodsForDate(schedule, date), slots.length * SLOT_MINUTES).includes(time))
    .map(({ date, time, name }) => ({ date, time, name }));
}

export async function saveWeeklyHours(slug, _previous, formData) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success) return { error: "notFound" };

  const { weeklyHours, errors } = readWeeklyHours(formData);
  if (Object.keys(errors).length > 0) return { errors, values: weeklyHours };

  // The two old fields stay filled from the first open day, for pages that were
  // built before weekly hours and until they're rebuilt
  const firstOpen = weeklyHours.find((day) => day.periods.length > 0);
  const legacy = firstOpen ? { opens: firstOpen.periods[0].opens, closes: firstOpen.periods.at(-1).closes } : {};

  const restaurant = await restaurants().findOneAndUpdate(
    owned(slug, user),
    { $set: { weeklyHours, ...legacy } },
    { returnDocument: "after", projection: { weeklyHours: 1, exceptions: 1 } },
  );
  if (!restaurant) return { error: "notFound" };
  refreshPublic(slug);
  return { values: weeklyHours, saved: Date.now(), affected: await outsideHours(restaurant._id, restaurant) };
}

export async function addException(slug, _previous, formData) {
  const values = readExceptionForm(formData);
  const user = await getActionUser();
  if (!user) return { values, error: "signedOut" };
  if (!idSchema.safeParse(slug).success) return { values, error: "notFound" };

  const parsed = exceptionSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };
  const today = riyadhDate();
  if (parsed.data.to < today) return { values, errors: { to: "datePast" } };

  const current = await restaurants().findOne(owned(slug, user), { projection: { exceptions: 1 } });
  if (!current) return { values, error: "notFound" };
  // Finished ones have no use any more, so they make room
  const kept = (current.exceptions ?? []).filter((item) => item.to >= today);
  if (kept.length >= MAX_EXCEPTIONS) return { values, error: "tooMany" };
  // A date with two rules would be ambiguous
  if (kept.some((item) => item.from <= parsed.data.to && parsed.data.from <= item.to)) return { values, errors: { from: "exceptionOverlap" } };

  const { note, ...rest } = parsed.data;
  const exception = { id: randomUUID(), ...rest, ...(note && { note }) };
  const exceptions = [...kept, exception].sort((a, b) => a.from.localeCompare(b.from));
  const restaurant = await restaurants().findOneAndUpdate(
    owned(slug, user),
    { $set: { exceptions } },
    { returnDocument: "after", projection: { weeklyHours: 1, exceptions: 1, opens: 1, closes: 1 } },
  );
  if (!restaurant) return { values, error: "notFound" };
  refreshPublic(slug);
  return { done: Date.now(), affected: await outsideHours(restaurant._id, restaurant) };
}

export async function removeException(slug, id) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success || typeof id !== "string") return { error: "stale" };
  await restaurants().updateOne(owned(slug, user), { $pull: { exceptions: { id } } });
  refreshPublic(slug);
  return { ok: true };
}
