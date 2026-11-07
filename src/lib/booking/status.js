import "server-only";
import { getDb } from "@/db/client";
import { BOOKINGS } from "@/db/config";
import { releaseSeats, reserveSeats } from "@/lib/booking/seats";
import { heldSlots, releasedAfter } from "@/lib/booking-slots";

// A booking's status and its seats change together. The status goes first, on condition
// that the booking is still what was read, so of two requests only one goes on to touch
// the seats.

// The filter must leave out cancelled bookings. Returns the booking as it was, or null
// if another request got there first.
export async function cancelBooking(filter, extraSet = {}) {
  const booking = await getDb()
    .collection(BOOKINGS)
    .findOneAndUpdate(filter, { $set: { status: "cancelled", updatedAt: new Date(), ...extraSet }, $unset: { proposal: "" } }, { returnDocument: "before" });
  // Seats it gave back earlier may belong to someone else by now
  if (booking) await releaseSeats({ ...booking, slots: heldSlots(booking) });
  return booking;
}

// Callers have already checked canSetStatus. Answers { ok } or { error }.
export async function changeBookingStatus({ booking, next, capacity, reason, now = new Date() }) {
  // updatedAt too: a booking moved to another time since it was read has other seats
  const unchanged = { _id: booking._id, status: booking.status, updatedAt: booking.updatedAt };

  if (next === "cancelled") {
    const cancelled = await cancelBooking(unchanged, reason ? { cancelReason: reason } : {});
    return cancelled ? { ok: true } : { error: "stale" };
  }

  const before = booking.releasedSlots ?? [];
  const after = releasedAfter(booking, next, now);
  const unset = { ...(next !== "confirmed" && { proposal: "" }), ...(after.length === 0 && { releasedSlots: "" }) };
  const { modifiedCount } = await getDb()
    .collection(BOOKINGS)
    .updateOne(unchanged, {
      $set: { status: next, updatedAt: new Date(), ...(after.length > 0 && { releasedSlots: after }) },
      ...(Object.keys(unset).length > 0 && { $unset: unset }),
    });
  if (!modifiedCount) return { error: "stale" };

  const seat = { restaurantId: booking.restaurantId, date: booking.date, party: booking.party };
  const toTake = before.filter((slot) => !after.includes(slot));
  if (toTake.length > 0 && !(await reserveSeats({ ...seat, slots: toTake, capacity }))) {
    // Someone else has those seats now, so it stays as it was
    await getDb()
      .collection(BOOKINGS)
      .updateOne({ _id: booking._id, status: next }, { $set: { status: booking.status, releasedSlots: before, updatedAt: new Date() } });
    return { error: "statusNoRoom" };
  }
  await releaseSeats({ ...seat, slots: after.filter((slot) => !before.includes(slot)) });
  return { ok: true };
}
