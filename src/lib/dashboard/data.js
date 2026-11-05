import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { RESTAURANTS } from "@/db/config";
import { getBookingSummary } from "@/lib/booking/owner-data";

// Dashboard reads. Never cached across users: every query is scoped to the
// signed-in owner, so one owner can't load another's restaurant by its address.

const ownedBy = (userId) => ({ ownerIds: new ObjectId(userId) });

// Cards for the dashboard home, newest first
export async function getMyRestaurants(userId) {
  const restaurants = await getDb()
    .collection(RESTAURANTS)
    .find(ownedBy(userId), { projection: { slug: 1, name: 1, accent: 1, menu: 1, opens: 1, closes: 1, booking: 1, bookingsSeenAt: 1 } })
    .sort({ createdAt: -1 })
    .toArray();
  return Promise.all(
    restaurants.map(async (restaurant) => ({
      ...summarize(restaurant),
      bookingEnabled: Boolean(restaurant.booking?.enabled),
      // Plain values only: this reaches the page as is
      summary: restaurant.booking ? await getBookingSummary(restaurant) : null,
    })),
  );
}

// The full editable restaurant, or null if it doesn't exist or isn't this user's
export async function getOwnedRestaurant(slug, userId) {
  const restaurant = await getDb()
    .collection(RESTAURANTS)
    .findOne({ slug, ...ownedBy(userId) }, { projection: { _id: 0, ownerIds: 0, createdAt: 0, bookingsSeenAt: 0 } });
  return restaurant && { ...restaurant, ...summarize(restaurant) };
}

function summarize({ slug, name, accent, menu }) {
  return {
    slug,
    name,
    accent,
    categoryCount: menu.length,
    dishCount: menu.reduce((sum, category) => sum + category.items.length, 0),
  };
}
