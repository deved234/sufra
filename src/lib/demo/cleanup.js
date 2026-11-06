import "server-only";
import { getDb } from "@/db/client";
import { BOOKING_DAYS, BOOKINGS, EMAIL_TOKENS, RESTAURANTS, SESSIONS, SITE_DRAFTS, SITE_VERSIONS, USERS } from "@/db/config";

// Everything a demo account made. Restaurants go first: should this stop halfway, what's
// left still has its expiry date, so the next run finds it again.
export async function removeDemoData({ restaurantIds, userIds }) {
  const db = getDb();
  await Promise.all(
    [BOOKINGS, BOOKING_DAYS, SITE_DRAFTS, SITE_VERSIONS].map((name) => db.collection(name).deleteMany({ restaurantId: { $in: restaurantIds } })),
  );
  await db.collection(RESTAURANTS).deleteMany({ _id: { $in: restaurantIds }, demoExpiresAt: { $exists: true } });
  await Promise.all([SESSIONS, EMAIL_TOKENS].map((name) => db.collection(name).deleteMany({ userId: { $in: userIds } })));
  await db.collection(USERS).deleteMany({ _id: { $in: userIds }, demoExpiresAt: { $exists: true } });
}

// Only ever matches what has an expiry date that has passed: nothing else has that field
export async function removeExpiredDemos(now = new Date()) {
  const db = getDb();
  const expired = { demoExpiresAt: { $lte: now } };
  const ids = async (name) => (await db.collection(name).find(expired, { projection: { _id: 1 } }).toArray()).map(({ _id }) => _id);
  const [restaurantIds, userIds] = await Promise.all([ids(RESTAURANTS), ids(USERS)]);
  await removeDemoData({ restaurantIds, userIds });
  return { restaurants: restaurantIds.length, users: userIds.length };
}
