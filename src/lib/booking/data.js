import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { BOOKINGS, RESTAURANTS } from "@/db/config";

// Booking reads. Each one is scoped to the signed-in customer or the restaurant's
// owner in the query itself, so another person's booking simply isn't found.

const isObjectId = (value) => typeof value === "string" && /^[0-9a-f]{24}$/.test(value);

// Plain values for the page: no ObjectIds or Dates reach client components
const toView = ({ _id, restaurantId, userId, startsAt, createdAt, updatedAt, ...booking }) => ({
  ...booking,
  id: _id.toString(),
  startsAt: startsAt.toISOString(),
});

export async function getMyBookings(userId) {
  const bookings = await getDb()
    .collection(BOOKINGS)
    .find({ userId: new ObjectId(userId) })
    .sort({ startsAt: -1 })
    .limit(100)
    .toArray();
  const restaurants = await getDb()
    .collection(RESTAURANTS)
    .find({ _id: { $in: [...new Set(bookings.map((b) => b.restaurantId))] } }, { projection: { slug: 1, name: 1 } })
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
    .findOne({ _id: booking.restaurantId }, { projection: { _id: 0, slug: 1, name: 1, address: 1, city: 1 } });
  return restaurant && { ...toView(booking), restaurant };
}

export async function getDayBookings(restaurantId, date) {
  const bookings = await getDb().collection(BOOKINGS).find({ restaurantId, date }).sort({ startsAt: 1 }).toArray();
  return bookings.map(toView);
}

// The owner's own restaurant with its id, for the bookings pages
export async function getOwnedRestaurantId(slug, userId) {
  const restaurant = await getDb()
    .collection(RESTAURANTS)
    .findOne({ slug, ownerIds: new ObjectId(userId) }, { projection: { _id: 1 } });
  return restaurant?._id ?? null;
}
