import "server-only";
import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { BOOKINGS, RESTAURANTS, USERS } from "@/db/config";
import { reserveSeats } from "@/lib/booking/seats";
import { removeDemoData } from "@/lib/demo/cleanup";
import { DEMO_DOMAIN, DEMO_HOURS } from "@/lib/demo/constants";
import { sampleBookings, sampleRestaurant } from "@/lib/demo/sample";

const NAME = { ar: "صاحب مطعم تجريبي", en: "Demo owner" };

// A new account of its own, with a restaurant full of sample data, so nobody sees what
// another visitor did. If any step fails, what was made so far is removed.
export async function createDemoAccount({ locale, now = new Date() }) {
  const db = getDb();
  const id = randomBytes(6).toString("hex");
  const expiresAt = new Date(now.getTime() + DEMO_HOURS * 60 * 60 * 1000);
  const userId = new ObjectId();
  const restaurantId = new ObjectId();
  const slug = `demo-${id}`;

  try {
    await db.collection(USERS).insertOne({ _id: userId, email: `owner-${id}@${DEMO_DOMAIN}`, name: NAME[locale], emailVerifiedAt: now, createdAt: now, demoExpiresAt: expiresAt });
    const restaurant = { _id: restaurantId, ...sampleRestaurant({ slug, ownerId: userId, expiresAt, now }) };
    await db.collection(RESTAURANTS).insertOne(restaurant);
    const bookings = sampleBookings({ restaurantId, restaurant, locale, expiresAt, now });
    await db.collection(BOOKINGS).insertMany(bookings);
    for (const { date, slots, party } of bookings) {
      await reserveSeats({ restaurantId, date, slots, party, capacity: restaurant.booking.capacity });
    }
  } catch (error) {
    await removeDemoData({ restaurantIds: [restaurantId], userIds: [userId] }).catch(() => {});
    throw error;
  }
  return { userId, slug };
}
