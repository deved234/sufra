import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { BOOKINGS, RESTAURANTS } from "@/db/config";

// Booking reads. Each one is scoped to the signed-in customer or the restaurant's
// owner in the query itself, so another person's booking simply isn't found.

const isObjectId = (value) => typeof value === "string" && /^[0-9a-f]{24}$/.test(value);

// Plain values for the page: no ObjectIds or Dates reach client components
export function toBookingView({ _id, restaurantId, userId, startsAt, createdAt, updatedAt, editedAt, customerActionAt, proposal, lastProposal, ...booking }) {
  return {
    ...booking,
    id: _id.toString(),
    startsAt: startsAt.toISOString(),
    edited: Boolean(editedAt),
    customerActionAt: customerActionAt?.toISOString() ?? null,
    proposal: proposal
      ? {
          date: proposal.date,
          time: proposal.time,
          party: proposal.party,
          reason: proposal.reason,
          by: proposal.by ?? "owner",
          // Past its deadline: the customer can't answer it any more
          expired: proposal.expiresAt <= new Date(),
        }
      : null,
    lastProposal: lastProposal ? { outcome: lastProposal.outcome, by: lastProposal.by ?? "owner", date: lastProposal.date, time: lastProposal.time, party: lastProposal.party } : null,
  };
}
const toView = toBookingView;

// Proposals waiting for this customer's answer, for a notice on their dashboard
export async function countMyPendingProposals(userId) {
  return getDb()
    .collection(BOOKINGS)
    .countDocuments({ userId: new ObjectId(userId), status: "confirmed", "proposal.by": { $ne: "customer" }, "proposal.expiresAt": { $gt: new Date() } });
}

export async function getMyBookings(userId) {
  const bookings = await getDb()
    .collection(BOOKINGS)
    .find({ userId: new ObjectId(userId) })
    .sort({ startsAt: -1 })
    .limit(100)
    .toArray();
  const restaurants = await getDb()
    .collection(RESTAURANTS)
    .find({ _id: { $in: bookings.map((b) => b.restaurantId) } }, { projection: { slug: 1, name: 1 } })
    .toArray();
  const byId = new Map(restaurants.map((r) => [r._id.toString(), r]));
  // A restaurant may have been removed since: its bookings go with it
  return bookings
    .filter((b) => byId.has(b.restaurantId.toString()))
    .map((b) => {
      const { slug, name } = byId.get(b.restaurantId.toString());
      return { ...toView(b), slug, restaurantName: name };
    });
}

export async function getMyBooking(id, userId) {
  if (!isObjectId(id)) return null;
  const booking = await getDb().collection(BOOKINGS).findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
  if (!booking) return null;
  const restaurant = await getDb()
    .collection(RESTAURANTS)
    .findOne({ _id: booking.restaurantId }, { projection: { _id: 0, slug: 1, name: 1, address: 1, city: 1, opens: 1, closes: 1, booking: 1 } });
  return restaurant && { ...toView(booking), restaurant };
}

export async function getDayBookings(restaurantId, date) {
  const bookings = await getDb().collection(BOOKINGS).find({ restaurantId, date }).sort({ startsAt: 1 }).toArray();
  return bookings.map(toView);
}

// The owner's own restaurant with its id, for the bookings pages. Server only: it
// holds ObjectIds and Dates.
export function getOwnedRestaurantDoc(slug, userId) {
  return getDb()
    .collection(RESTAURANTS)
    .findOne({ slug, ownerIds: new ObjectId(userId) }, { projection: { opens: 1, closes: 1, booking: 1, bookingsSeenAt: 1 } });
}
