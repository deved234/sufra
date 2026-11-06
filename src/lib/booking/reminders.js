import "server-only";
import { getDb } from "@/db/client";
import { BOOKINGS, RESTAURANTS } from "@/db/config";
import { reminderWindow } from "@/lib/booking/reminder-window";
import { NON_PUBLIC_STATUSES } from "@/lib/restaurant-status";

// Only customers with an account: a booking taken by phone has no email. Asked again
// when claiming, in case the booking changed since it was read.
const dueFilter = (now) => {
  const { after, until, madeBefore } = reminderWindow(now);
  return {
    status: "confirmed",
    userId: { $ne: null },
    email: { $type: "string" },
    reminderSentAt: { $exists: false },
    startsAt: { $gt: after, $lte: until },
    createdAt: { $lte: madeBefore },
  };
};

// Each booking is claimed in the database before its email goes out, so two runs at
// once, which Vercel says can happen, can't both send it. If the email then fails, that
// reminder is lost, which is kinder than sending it again and again.
//
// limit keeps within the mail account's daily allowance, and timeLimitMs stops in time
// to answer before the function is cut off. What's left is still due at the next run.
export async function sendDueReminders({ send, now = new Date(), limit = 100, timeLimitMs = 240_000 }) {
  const db = getDb();
  const bookings = db.collection(BOOKINGS);
  const filter = dueFilter(now);
  const stopAt = Date.now() + timeLimitMs;
  const restaurants = new Map();
  let reminded = 0;

  for await (const { _id, restaurantId } of bookings.find(filter, { projection: { restaurantId: 1 } }).sort({ startsAt: 1 })) {
    if (reminded >= limit || Date.now() >= stopAt) break;

    const key = restaurantId.toString();
    if (!restaurants.has(key)) {
      const open = await db.collection(RESTAURANTS).findOne({ _id: restaurantId, status: { $nin: NON_PUBLIC_STATUSES } }, { projection: { name: 1 } });
      restaurants.set(key, open);
    }
    const restaurant = restaurants.get(key);
    if (!restaurant) continue;

    const booking = await bookings.findOneAndUpdate({ _id, ...filter }, { $set: { reminderSentAt: new Date() } }, { returnDocument: "after" });
    if (!booking) continue;
    await send(booking, restaurant);
    reminded++;
  }
  return { reminded };
}
