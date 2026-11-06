"use server";

import { randomInt } from "node:crypto";
import { ObjectId } from "mongodb";
import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { getDb } from "@/db/client";
import { BOOKING_DAYS, BOOKINGS, RESTAURANTS, USERS } from "@/db/config";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auditRestaurantEdit } from "@/lib/admin/log";
import { getActionUser } from "@/lib/auth/dal";
import { manageFilter } from "@/lib/dashboard/access";
import {
  sendBookingCancelled,
  sendBookingConfirmed,
  sendBookingProposal,
  sendCustomerRequest,
  sendNewBookingToOwners,
  sendOwnerCancellationNotice,
  sendProposalDecision,
  sendRequestDecision,
} from "@/lib/auth/emails";
import { hit, isLimited, LIMITS } from "@/lib/auth/rate-limit";
import { applyBookingChange } from "@/lib/booking/change";
import { getSeats, releaseSeats, reserveSeats } from "@/lib/booking/seats";
import { availableSlots, bookableDates, DEFAULT_BOOKING, riyadhDate, seatsWithout, slotsCovered, slotStart } from "@/lib/booking-slots";
import { periodsForDate } from "@/lib/opening-hours";
import { PUBLIC_RESTAURANT } from "@/lib/restaurants";
import { fieldErrors } from "@/lib/validation/auth";
import {
  bookingChangeSchema,
  bookingSchema,
  bookingSettingsSchema,
  manualBookingSchema,
  readBookingChangeForm,
  readBookingForm,
  readBookingSettingsForm,
} from "@/lib/validation/booking";
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
  const { booking } = restaurant;
  if (!booking?.enabled) return { error: "bookingClosed" };
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
    startsAt: slotStart(date, time, periodsForDate(restaurant, date)),
    party,
    name,
    email,
    phone,
    ...(note && { note }),
    status: "confirmed",
    code: newCode(),
    locale,
    ...(source === "online" && { customerActionAt: now }),
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
  getDb().collection(RESTAURANTS).findOne({ slug, ...PUBLIC_RESTAURANT, "booking.enabled": true }, { projection: { name: 1, slug: 1, opens: 1, closes: 1, weeklyHours: 1, exceptions: 1, booking: 1, ownerIds: 1 } });

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
  redirect({ href: { pathname: `/account/bookings/${result.booking._id}`, query: { new: 1 } }, locale });
}

// The filter must leave out cancelled bookings. Only one request can match, so two
// clicks can't give the seats back twice.
async function cancel(filter, extraSet = {}) {
  const booking = await getDb()
    .collection(BOOKINGS)
    .findOneAndUpdate(filter, { $set: { status: "cancelled", updatedAt: new Date(), ...extraSet }, $unset: { proposal: "" } }, { returnDocument: "before" });
  if (booking) await releaseSeats(booking);
  return booking;
}

export async function cancelMyBooking(id) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!isObjectId(id)) return { error: "notFound" };

  // Only before it starts, and only while nothing has happened to it yet
  const booking = await cancel({ _id: new ObjectId(id), userId: new ObjectId(user.id), status: "confirmed", startsAt: { $gt: new Date() } }, { customerActionAt: new Date() });
  if (!booking) return { error: "cancelTooLate" };

  const restaurant = await getDb().collection(RESTAURANTS).findOne({ _id: booking.restaurantId }, { projection: { name: 1, slug: 1, ownerIds: 1 } });
  if (restaurant) after(() => sendOwnerCancellationNotice(booking, restaurant));
  refresh();
  return { ok: true };
}

const ownedRestaurant = (slug, user) =>
  getDb().collection(RESTAURANTS).findOne(manageFilter(user, slug), { projection: { name: 1, slug: 1, opens: 1, closes: 1, weeklyHours: 1, exceptions: 1, booking: 1 } });

export async function setBookingStatus(slug, id, status) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success || !isObjectId(id) || !STATUSES.includes(status)) return { error: "stale" };
  const restaurant = await ownedRestaurant(slug, user);
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
      // A booking that has moved on has nothing left to reschedule
      .updateOne({ ...filter, status: { $ne: "cancelled" } }, { $set: { status, updatedAt: new Date() }, ...(status !== "confirmed" && { $unset: { proposal: "" } }) });
    if (!matchedCount) return { error: "stale" };
  }
  await auditRestaurantEdit(user, slug, "bookingChanged", `${id} ${status}`);
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

  const restaurant = await ownedRestaurant(slug, user);
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
  await auditRestaurantEdit(user, slug, "bookingChanged", "added by phone");
  refresh();
  return { done: Date.now() };
}

export async function saveBookingSettings(slug, _previous, formData) {
  const values = readBookingSettingsForm(formData);
  const user = await getActionUser();
  if (!user) return { values, error: "signedOut" };
  if (!idSchema.safeParse(slug).success) return { values, error: "notFound" };

  const restaurants = getDb().collection(RESTAURANTS);
  const owned = manageFilter(user, slug);
  const refreshPublic = () => {
    // The public page shows or hides its booking button, and its card in the lists
    updateTag(`restaurant:${slug}`);
    updateTag("restaurants");
  };

  // Turning it off needs no numbers, so a restaurant that doesn't want bookings is
  // never asked for them. What was set before stays for next time.
  if (!values.enabled) {
    const restaurant = await restaurants.findOne(owned, { projection: { _id: 1, booking: 1 } });
    if (!restaurant) return { values, error: "notFound" };
    if (restaurant.booking) await restaurants.updateOne({ _id: restaurant._id }, { $set: { "booking.enabled": false } });
    refreshPublic();
    await auditRestaurantEdit(user, slug, "bookingSettings", "off");
    return { values: { ...DEFAULT_BOOKING, ...restaurant.booking, enabled: false }, saved: Date.now() };
  }

  const parsed = bookingSettingsSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const restaurant = await restaurants.findOneAndUpdate(owned, { $set: { booking: parsed.data } }, { projection: { _id: 1 } });
  if (!restaurant) return { values, error: "notFound" };
  refreshPublic();
  await auditRestaurantEdit(user, slug, "bookingSettings", "on");

  // Days already booked past the new number keep their bookings; the owner should know
  const days = await getDb()
    .collection(BOOKING_DAYS)
    .find({ restaurantId: restaurant._id, date: { $gte: riyadhDate() } }, { projection: { date: 1, seats: 1 } })
    .sort({ date: 1 })
    .toArray();
  const overbooked = days.filter((day) => Object.values(day.seats).some((taken) => taken > parsed.data.capacity)).map((day) => day.date);
  return { values: parsed.data, saved: Date.now(), overbooked };
}

// The owner has seen what customers did. Only the owner's own restaurant matches.
export async function markBookingsSeen(slug) {
  const user = await getActionUser();
  if (!user || !idSchema.safeParse(slug).success) return;
  await getDb()
    .collection(RESTAURANTS)
    .updateOne({ slug, ownerIds: new ObjectId(user.id), status: { $ne: "deleted" } }, { $set: { bookingsSeenAt: new Date() } });
  refresh();
}

// The time, day or party an owner wants to change a booking to: checked against the
// live hours and seats, not counting this booking's own share.
async function checkChange(restaurant, booking, { date, time, party }) {
  const config = restaurant.booking;
  if (!config) return { error: "bookingClosed" };
  if (party > config.maxParty) return { error: "partyTooLarge" };
  if (!bookableDates().includes(date)) return { error: "slotTaken" };
  if (date === booking.date && time === booking.time && party === booking.party) return { error: "noChange" };

  const taken = await getSeats(restaurant._id, date);
  const seats = date === booking.date ? seatsWithout(taken, booking) : taken;
  const slot = availableSlots({ opens: restaurant.opens, closes: restaurant.closes, weeklyHours: restaurant.weeklyHours, exceptions: restaurant.exceptions, booking: config, date, seats }).find((candidate) => candidate.time === time);
  if (!slot || slot.left < party) return { error: "slotTaken" };

  return { change: { date, time, party, slots: slotsCovered(time, config.durationMinutes), startsAt: slotStart(date, time, periodsForDate(restaurant, date)) } };
}

// An owner can't move a customer's table by themselves: this asks the customer, who
// accepts or declines. A booking the owner took by phone has no account to ask, and
// the owner just spoke with that person, so it changes right away.
export async function proposeBookingChange(slug, id, _previous, formData) {
  const values = readBookingChangeForm(formData);
  const user = await getActionUser();
  if (!user) return { values, error: "signedOut" };
  if (!idSchema.safeParse(slug).success || !isObjectId(id)) return { values, error: "notFound" };

  const parsed = bookingChangeSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const restaurant = await ownedRestaurant(slug, user);
  if (!restaurant) return { values, error: "notFound" };
  const booking = await getDb()
    .collection(BOOKINGS)
    .findOne({ _id: new ObjectId(id), restaurantId: restaurant._id, status: "confirmed", startsAt: { $gt: new Date() } });
  if (!booking) return { values, error: "stale" };
  // One open request at a time: the customer's question gets an answer first
  if (booking.proposal?.by === "customer" && booking.proposal.expiresAt > new Date()) return { values, error: "answerRequestFirst" };

  const checked = await checkChange(restaurant, booking, parsed.data);
  if (checked.error) return { values, error: checked.error };
  const { change } = checked;

  if (!booking.userId) {
    const result = await applyBookingChange({
      booking,
      change,
      capacity: restaurant.booking.capacity,
      filter: { status: "confirmed", date: booking.date, time: booking.time, party: booking.party },
    });
    if (result.error) return { values, error: result.error };
    await auditRestaurantEdit(user, slug, "bookingChanged", "edited");
    refresh();
    return { done: Date.now() };
  }

  const { reason } = parsed.data;
  if (!reason) return { values, errors: { reason: "required" } };
  const now = new Date();
  const proposal = { ...change, by: "owner", reason, expiresAt: new Date(Math.min(booking.startsAt.getTime(), change.startsAt.getTime())), createdAt: now };
  const { modifiedCount } = await getDb()
    .collection(BOOKINGS)
    .updateOne({ _id: booking._id, status: "confirmed" }, { $set: { proposal, updatedAt: now } });
  if (!modifiedCount) return { values, error: "stale" };

  await auditRestaurantEdit(user, slug, "bookingChanged", "change proposed");
  after(() => sendBookingProposal(booking, proposal, restaurant));
  refresh();
  return { done: Date.now() };
}

export async function withdrawProposal(slug, id) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success || !isObjectId(id)) return { error: "stale" };
  const restaurant = await ownedRestaurant(slug, user);
  if (!restaurant) return { error: "notFound" };
  await getDb()
    .collection(BOOKINGS)
    .updateOne({ _id: new ObjectId(id), restaurantId: restaurant._id, "proposal.by": { $ne: "customer" } }, { $unset: { proposal: "" }, $set: { updatedAt: new Date() } });
  refresh();
  return { ok: true };
}

// Settles an open request, whichever side asked. Declining leaves the booking exactly as
// it was. Only the request that was read can match: two clicks, or a newer request, won't.
async function settleRequest({ booking, restaurant, accept, extraSet = {} }) {
  const { proposal } = booking;
  const now = new Date();
  const decided = {
    lastProposal: { outcome: accept ? "accepted" : "declined", by: proposal.by ?? "owner", date: proposal.date, time: proposal.time, party: proposal.party, decidedAt: now },
    ...extraSet,
  };
  const stillOpen = { status: "confirmed", "proposal.createdAt": proposal.createdAt };

  if (accept) {
    return applyBookingChange({
      booking,
      change: proposal,
      capacity: restaurant.booking?.capacity ?? 0,
      filter: stillOpen,
      extraSet: decided,
      extraUnset: { proposal: "" },
    });
  }
  const { modifiedCount } = await getDb()
    .collection(BOOKINGS)
    .updateOne({ _id: booking._id, ...stillOpen }, { $set: { ...decided, updatedAt: now }, $unset: { proposal: "" } });
  return modifiedCount ? { ok: true } : { error: "proposalGone" };
}

// The customer's answer to the owner. Either way the owner hears about it, on the
// bookings page and by email.
export async function respondToProposal(id, accept) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!isObjectId(id) || typeof accept !== "boolean") return { error: "stale" };

  const now = new Date();
  const booking = await getDb()
    .collection(BOOKINGS)
    .findOne({ _id: new ObjectId(id), userId: new ObjectId(user.id), status: "confirmed", "proposal.by": { $ne: "customer" }, "proposal.expiresAt": { $gt: now } });
  if (!booking) return { error: "proposalGone" };

  const restaurant = await getDb()
    .collection(RESTAURANTS)
    .findOne({ _id: booking.restaurantId }, { projection: { name: 1, slug: 1, ownerIds: 1, booking: 1 } });
  if (!restaurant) return { error: "proposalGone" };

  const result = await settleRequest({ booking, restaurant, accept, extraSet: { customerActionAt: now } });
  if (result.error) return { error: result.error };
  after(() => sendProposalDecision(booking, booking.proposal, restaurant, accept));
  refresh();
  return { ok: true };
}

// The customer asks to change their booking. Like the owner's proposals, it takes the
// other side's approval, and nothing moves until then.
export async function requestBookingChange(id, _previous, formData) {
  const values = readBookingChangeForm(formData);
  const user = await getActionUser();
  if (!user) return { values, error: "signedOut" };
  if (!isObjectId(id)) return { values, error: "notFound" };

  const parsed = bookingChangeSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };
  if (!parsed.data.reason) return { values, errors: { reason: "required" } };

  const key = `booking-change:user:${user.id}`;
  if (await isLimited(key, LIMITS.bookingUser)) return { values, error: "tooManyAttempts" };

  const now = new Date();
  const booking = await getDb()
    .collection(BOOKINGS)
    .findOne({ _id: new ObjectId(id), userId: new ObjectId(user.id), status: "confirmed", startsAt: { $gt: now } });
  if (!booking) return { values, error: "stale" };
  if (booking.proposal && booking.proposal.by !== "customer" && booking.proposal.expiresAt > now) return { values, error: "answerProposalFirst" };

  const restaurant = await getDb()
    .collection(RESTAURANTS)
    .findOne({ _id: booking.restaurantId, ...PUBLIC_RESTAURANT, "booking.enabled": true }, { projection: { name: 1, slug: 1, opens: 1, closes: 1, weeklyHours: 1, exceptions: 1, booking: 1, ownerIds: 1 } });
  if (!restaurant) return { values, error: "bookingClosed" };

  const checked = await checkChange(restaurant, booking, parsed.data);
  if (checked.error) return { values, error: checked.error };
  const { change } = checked;

  const proposal = { ...change, by: "customer", reason: parsed.data.reason, expiresAt: new Date(Math.min(booking.startsAt.getTime(), change.startsAt.getTime())), createdAt: now };
  const { modifiedCount } = await getDb()
    .collection(BOOKINGS)
    .updateOne({ _id: booking._id, status: "confirmed" }, { $set: { proposal, customerActionAt: now, updatedAt: now } });
  if (!modifiedCount) return { values, error: "stale" };
  await hit(key, LIMITS.bookingUser);

  after(() => sendCustomerRequest(booking, proposal, restaurant));
  refresh();
  return { done: Date.now() };
}

export async function withdrawMyRequest(id) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!isObjectId(id)) return { error: "stale" };
  await getDb()
    .collection(BOOKINGS)
    .updateOne({ _id: new ObjectId(id), userId: new ObjectId(user.id), "proposal.by": "customer" }, { $unset: { proposal: "" }, $set: { updatedAt: new Date() } });
  refresh();
  return { ok: true };
}

// The owner's answer to the customer, who hears about it by email and on their page
export async function respondToCustomerRequest(slug, id, accept) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success || !isObjectId(id) || typeof accept !== "boolean") return { error: "stale" };
  const restaurant = await ownedRestaurant(slug, user);
  if (!restaurant) return { error: "notFound" };

  const booking = await getDb()
    .collection(BOOKINGS)
    .findOne({ _id: new ObjectId(id), restaurantId: restaurant._id, status: "confirmed", "proposal.by": "customer", "proposal.expiresAt": { $gt: new Date() } });
  if (!booking) return { error: "proposalGone" };

  const result = await settleRequest({ booking, restaurant, accept });
  if (result.error) return { error: result.error };
  await auditRestaurantEdit(user, slug, "bookingChanged", accept ? "request accepted" : "request declined");
  after(() => sendRequestDecision(booking, booking.proposal, restaurant, accept));
  refresh();
  return { ok: true };
}
