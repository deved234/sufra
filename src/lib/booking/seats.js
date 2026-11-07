import "server-only";
import { Int32 } from "mongodb";
import { getDb } from "@/db/client";
import { BOOKING_DAYS } from "@/db/config";
import { addDays } from "@/lib/booking-slots";

// One document per restaurant and day counts the seats taken in each half hour.
// All the half hours of a booking live in that one document, and MongoDB applies an
// update to a single document atomically. So "are there seats?" and "take them" are
// one step: two people after the last seats can't both pass the check, and no
// transaction is needed.

const days = () => getDb().collection(BOOKING_DAYS);
const dayId = (restaurantId, date) => `${restaurantId}:${date}`;

export async function reserveSeats({ restaurantId, date, slots, party, capacity }) {
  // Matches only if every half hour has room. "Not more than" also matches a half
  // hour nobody has booked yet, where the field doesn't exist.
  const filter = { _id: dayId(restaurantId, date) };
  for (const slot of slots) filter[`seats.${slot}`] = { $not: { $gt: capacity - party } };
  const update = {
    $inc: Object.fromEntries(slots.map((slot) => [`seats.${slot}`, new Int32(party)])),
    // The counters are only useful until the day has passed; a TTL index removes them
    $setOnInsert: { restaurantId, date, expiresAt: new Date(`${addDays(date, 3)}T00:00:00Z`) },
  };

  // No match means an upsert: it inserts a new day, or fails on the _id when the day
  // exists but has no room. The first failure may also be two people creating the
  // same day at once, so it asks again; by then the day exists and the filter decides.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await days().updateOne(filter, update, { upsert: true });
      return true;
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  return false;
}

export async function releaseSeats({ restaurantId, date, slots, party }) {
  // MongoDB refuses an empty $inc
  if (slots.length === 0) return;
  await days().updateOne(
    { _id: dayId(restaurantId, date) },
    { $inc: Object.fromEntries(slots.map((slot) => [`seats.${slot}`, new Int32(-party)])) },
  );
}

// How each half hour's count changes when a booking moves within its day
function seatDifference({ fromSlots, fromParty, toSlots, toParty }) {
  const difference = {};
  for (const slot of fromSlots) difference[slot] = (difference[slot] ?? 0) - fromParty;
  for (const slot of toSlots) difference[slot] = (difference[slot] ?? 0) + toParty;
  return Object.entries(difference).filter(([, change]) => change !== 0);
}

// One atomic update, so a booking moving half an hour doesn't compete with itself:
// only half hours gaining seats need room.
export async function moveSeatsWithinDay({ restaurantId, date, capacity, ...move }) {
  const changes = seatDifference(move);
  if (changes.length === 0) return true;
  const filter = { _id: dayId(restaurantId, date) };
  for (const [slot, change] of changes) {
    if (change > 0) filter[`seats.${slot}`] = { $not: { $gt: capacity - change } };
  }
  const update = { $inc: Object.fromEntries(changes.map(([slot, change]) => [`seats.${slot}`, new Int32(change)])) };
  const { matchedCount } = await days().updateOne(filter, update);
  return matchedCount === 1;
}

export async function undoMoveWithinDay({ restaurantId, date, ...move }) {
  const changes = seatDifference(move);
  if (changes.length === 0) return;
  await days().updateOne(
    { _id: dayId(restaurantId, date) },
    { $inc: Object.fromEntries(changes.map(([slot, change]) => [`seats.${slot}`, new Int32(-change)])) },
  );
}

export async function getSeats(restaurantId, date) {
  const day = await days().findOne({ _id: dayId(restaurantId, date) }, { projection: { seats: 1 } });
  return day?.seats ?? {};
}
