import "server-only";
import { getDb } from "@/db/client";
import { BOOKINGS } from "@/db/config";
import { moveSeatsWithinDay, releaseSeats, reserveSeats, undoMoveWithinDay } from "@/lib/booking/seats";

// Moves a booking to a new time and updates its seats. The booking is only saved once
// the seats are secured, and the seats go back if saving fails, so the counts never
// drift from the bookings. `filter` is what must still be true of the booking.
// extraSet: fields saved with the move. Answers { ok } or { error }.
export async function applyBookingChange({ booking, change, capacity, filter, extraSet = {}, extraUnset = {} }) {
  const { restaurantId } = booking;
  const sameDay = change.date === booking.date;
  const move = { restaurantId, date: booking.date, fromSlots: booking.slots, fromParty: booking.party, toSlots: change.slots, toParty: change.party };

  // Same day: one atomic update with the difference, so a booking never competes with
  // its own seats. Another day: take the new seats first and keep the old until saved,
  // so a full day leaves the booking exactly where it was.
  const secured = sameDay
    ? await moveSeatsWithinDay({ ...move, capacity })
    : await reserveSeats({ restaurantId, date: change.date, slots: change.slots, party: change.party, capacity });
  if (!secured) return { error: "proposalNoRoom" };

  const undo = () =>
    sameDay ? undoMoveWithinDay(move) : releaseSeats({ restaurantId, date: change.date, slots: change.slots, party: change.party });

  const { date, time, slots, startsAt, party } = change;
  const update = { $set: { date, time, slots, startsAt, party, editedAt: new Date(), updatedAt: new Date(), ...extraSet } };
  // A new time gets its own reminder. A new party size at the same time doesn't.
  const moved = startsAt.getTime() !== booking.startsAt.getTime();
  const unset = { ...extraUnset, ...(moved && { reminderSentAt: "" }) };
  if (Object.keys(unset).length > 0) update.$unset = unset;

  try {
    const { modifiedCount } = await getDb().collection(BOOKINGS).updateOne({ _id: booking._id, ...filter }, update);
    if (!modifiedCount) {
      await undo();
      return { error: "stale" };
    }
  } catch (error) {
    await undo();
    // The customer already has another booking at that exact time
    if (error.code === 11000) return { error: "alreadyBooked" };
    throw error;
  }

  if (!sameDay) await releaseSeats(booking);
  return { ok: true };
}
