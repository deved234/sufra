"use server";

import { randomInt } from "node:crypto";
import { ObjectId } from "mongodb";
import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { getDb } from "@/db/client";
import { BOOKINGS, RESTAURANTS, USERS } from "@/db/config";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getActionUser } from "@/lib/auth/dal";
import { sendBookingCancelled, sendBookingConfirmed, sendNewBookingToOwners, sendOwnerCancellationNotice } from "@/lib/auth/emails";
import { hit, isLimited, LIMITS } from "@/lib/auth/rate-limit";
import { releaseSeats, reserveSeats } from "@/lib/booking/seats";
import { availableSlots, bookableDates, DEFAULT_BOOKING, slotsCovered, slotStart } from "@/lib/booking-slots";
import { fieldErrors } from "@/lib/validation/auth";
import { bookingSchema, bookingSettingsSchema, manualBookingSchema, readBookingForm, readBookingSettingsForm } from "@/lib/validation/booking";
import { idSchema } from "@/lib/validation/menu";

// Server Actions are public endpoints: each one checks who is calling, and everything
// the browser sends (slot, party, status) is checked again here.

const STATUSES = ["confirmed", "seated", "completed", "noShow", "cancelled"];

function formLocale(formData) {
  const locale = formData.get("locale");
  return routing.locales.includes(locale) ? locale : routing.defaultLocale;
}

const isObjectId = (value) => typeof value === "string" && /^[0-9a-f]{24}$/.test(value);

// Read aloud at the restaurant door, so no letters that look alike (0/O, 1/I)
const CODE_LETTERS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const newCode = () => Array.from({ length: 6 }, () => CODE_LETTERS[randomInt(CODE_LETTERS.length)]).join("");

// Checks the time against the live hours and takes the seats. Everything the page
// showed may be out of date by now.
async function placeBooking({ restaurant, input, locale, userId, email, name, source }) {
  const booking = restaurant.booking ?? DEFAULT_BOOKING;
  const { party, date, time, phone, note } = input;
  if (party > booking.maxParty) return { error: "partyTooLarge" };
  if (!bookableDates().includes(date)) return { error: "slotTaken" };
  const slot = availableSlots({ ...restaurant, booking, date }).find((candidate) => candidate.time === time);
  if (!slot) return { error: "slotTaken" };

  const slots = slotsCovered(time, booking.durationMinutes);
  const seat = { restaurantId: restaurant._id, date, slots, party };
  if (!(await reserveSeats({ ...seat, capacity: booking.capacity }))) return { error: "slotTaken" };

  const now = new Date();
  const doc = {
    restaurantId: restaurant._id,
    userId,
    source,
    date,
    time,
    slots,
    startsAt: slotStart(date, time, restaurant.opens),
    party,
    name,
    email,
    phone,
    ...(note && { note }),
    status: "confirmed",
    code: newCode(),
    locale,
    createdAt: now,
    updatedAt: now,
  };
  try {
    const { insertedId } = await getDb().collection(BOOKINGS).insertOne(doc);
    return { booking: { ...doc, _id: insertedId } };
  } catch (error) {
    // The seats go back if the booking itself can't be saved, for any reason
    await releaseSeats(seat);
    if (error.code === 11000) return { error: "alreadyBooked" };
    throw error;
  }
}

const bookableRestaurant = (slug) =>
  getDb().collection(RESTAURANTS).findOne({ slug, "booking.enabled": true }, { projection: { name: 1, slug: 1, opens: 1, closes: 1, booking: 1, ownerIds: 1 } });

// A customer's own booking. An account with a confirmed email is required, so every
// booking has a real, reachable person behind it.
export async function createBooking(slug, _previous, formData) {
  const values = readBookingForm(formData);
  const user = await getActionUser();
  if (!user) return { values, error: "signedOut" };
  if (!idSchema.safeParse(slug).success) return { values, error: "notFound" };

  const parsed = bookingSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const key = `booking:user:${user.id}`;
  if (await isLimited(key, LIMITS.bookingUser)) return { values, error: "tooManyAttempts" };

  const restaurant = await bookableRestaurant(slug);
  if (!restaurant) return { values, error: "bookingClosed" };

  const locale = formLocale(formData);
  const userId = new ObjectId(user.id);
  const result = await placeBooking({ restaurant, input: parsed.data, locale, userId, email: user.email, name: user.name, source: "online" });
  if (result.error) return { values, error: result.error };
  await hit(key, LIMITS.bookingUser);

  // Filled in for them next time
  await getDb().collection(USERS).updateOne({ _id: userId }, { $set: { phone: parsed.data.phone } });
  after(() => sendBookingConfirmed(result.booking, restaurant));
  after(() => sendNewBookingToOwners(result.booking, restaurant));
  redirect({ href: { pathname: `/dashboard/bookings/${result.booking._id}`, query: { new: 1 } }, locale });
}

// The filter must leave out cancelled bookings. Only one request can match, so two
// clicks can't give the seats back twice.
async function cancel(filter) {
  const booking = await getDb()
    .collection(BOOKINGS)
    .findOneAndUpdate(filter, { $set: { status: "cancelled", updatedAt: new Date() } }, { returnDocument: "before" });
  if (booking) await releaseSeats(booking);
  return booking;
}

export async function cancelMyBooking(id) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!isObjectId(id)) return { error: "notFound" };

  // Only before it starts, and only while nothing has happened to it yet
  const booking = await cancel({ _id: new ObjectId(id), userId: new ObjectId(user.id), status: "confirmed", startsAt: { $gt: new Date() } });
  if (!booking) return { error: "cancelTooLate" };

  const restaurant = await getDb().collection(RESTAURANTS).findOne({ _id: booking.restaurantId }, { projection: { name: 1, slug: 1, ownerIds: 1 } });
  if (restaurant) after(() => sendOwnerCancellationNotice(booking, restaurant));
  refresh();
  return { ok: true };
}

const ownedRestaurant = (slug, userId) =>
  getDb().collection(RESTAURANTS).findOne({ slug, ownerIds: new ObjectId(userId) }, { projection: { name: 1, slug: 1, opens: 1, closes: 1, booking: 1 } });

export async function setBookingStatus(slug, id, status) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success || !isObjectId(id) || !STATUSES.includes(status)) return { error: "stale" };
  const restaurant = await ownedRestaurant(slug, user.id);
  if (!restaurant) return { error: "notFound" };

  const filter = { _id: new ObjectId(id), restaurantId: restaurant._id };
  if (status === "cancelled") {
    const booking = await cancel({ ...filter, status: { $ne: "cancelled" } });
    if (!booking) return { error: "stale" };
    if (booking.email) after(() => sendBookingCancelled(booking, restaurant));
  } else {
    // A cancelled booking stays cancelled: its seats may belong to someone else by now
    const { matchedCount } = await getDb()
      .collection(BOOKINGS)
      .updateOne({ ...filter, status: { $ne: "cancelled" } }, { $set: { status, updatedAt: new Date() } });
    if (!matchedCount) return { error: "stale" };
  }
  refresh();
  return { ok: true };
}

// A booking taken over the phone goes through the same seat check as an online one
export async function addManualBooking(slug, _previous, formData) {
  const values = readBookingForm(formData);
  const user = await getActionUser();
  if (!user) return { values, error: "signedOut" };
  if (!idSchema.safeParse(slug).success) return { values, error: "notFound" };

  const parsed = manualBookingSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const restaurant = await ownedRestaurant(slug, user.id);
  if (!restaurant) return { values, error: "notFound" };

  const result = await placeBooking({
    restaurant,
    input: parsed.data,
    locale: formLocale(formData),
    userId: null,
    email: null,
    name: parsed.data.name,
    source: "owner",
  });
  if (result.error) return { values, error: result.error };
  refresh();
  return { done: Date.now() };
}

export async function saveBookingSettings(slug, _previous, formData) {
  const values = readBookingSettingsForm(formData);
  const user = await getActionUser();
  if (!user) return { values, error: "signedOut" };
  if (!idSchema.safeParse(slug).success) return { values, error: "notFound" };

  const parsed = bookingSettingsSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const { matchedCount } = await getDb()
    .collection(RESTAURANTS)
    .updateOne({ slug, ownerIds: new ObjectId(user.id) }, { $set: { booking: parsed.data } });
  if (!matchedCount) return { values, error: "notFound" };

  // The public page shows or hides its booking button
  updateTag(`restaurant:${slug}`);
  return { values: parsed.data, saved: Date.now() };
}
