import "server-only";
import { getDb } from "@/db/client";
import { BOOKING_DAYS, BOOKINGS, RESTAURANTS } from "@/db/config";
import { toBookingView } from "@/lib/booking/data";
import { addDays, currentService, riyadhDate } from "@/lib/booking-slots";

// What an owner needs at a glance. Callers have already checked the restaurant is
// theirs: these take its id.

const WEEK_DAYS = 7;
const MAX_SEARCH_RESULTS = 30;
const LIVE = { $nin: ["cancelled", "noShow"] };

// Things customers did since the owner last looked: new bookings, cancellations and
// answers to proposed changes
const unseenFilter = (restaurantId, seenAt) => ({ restaurantId, customerActionAt: { $gt: seenAt ?? new Date(0) } });

export function countUnseen(restaurantId, seenAt) {
  return getDb().collection(BOOKINGS).countDocuments(unseenFilter(restaurantId, seenAt));
}

// What every page of a restaurant shows in its header: the new count, and the status
export async function getRestaurantBar(slug) {
  const restaurant = await getDb().collection(RESTAURANTS).findOne({ slug }, { projection: { bookingsSeenAt: 1, status: 1, suspendedReason: 1, ownerIds: 1 } });
  if (!restaurant) return { unseen: 0, status: "published", upcoming: 0, suspendedReason: null, ownerIds: [] };
  const [unseen, upcoming] = await Promise.all([
    countUnseen(restaurant._id, restaurant.bookingsSeenAt),
    getDb().collection(BOOKINGS).countDocuments({ restaurantId: restaurant._id, status: "confirmed", startsAt: { $gt: new Date() } }),
  ]);
  return {
    unseen,
    status: restaurant.status ?? "published",
    upcoming,
    suspendedReason: restaurant.suspendedReason ?? null,
    ownerIds: (restaurant.ownerIds ?? []).map((id) => id.toString()),
  };
}

// The coming week: bookings per day and how full its fullest half hour gets
export async function getWeekStrip(restaurantId, capacity, today = riyadhDate()) {
  const dates = Array.from({ length: WEEK_DAYS }, (_, i) => addDays(today, i));
  const [bookings, days] = await Promise.all([
    getDb()
      .collection(BOOKINGS)
      .find({ restaurantId, date: { $in: dates }, status: LIVE }, { projection: { date: 1 } })
      .toArray(),
    getDb()
      .collection(BOOKING_DAYS)
      .find({ restaurantId, date: { $in: dates } }, { projection: { date: 1, seats: 1 } })
      .toArray(),
  ]);
  return dates.map((date) => {
    const seats = days.find((day) => day.date === date)?.seats ?? {};
    const fullest = Math.max(0, ...Object.values(seats));
    return {
      date,
      count: bookings.filter((booking) => booking.date === date).length,
      fill: capacity ? Math.min(fullest / capacity, 1) : 0,
    };
  });
}

// One restaurant's numbers: today, right now, and who is coming next
export async function getBookingSummary(restaurant) {
  const { _id: restaurantId, booking, bookingsSeenAt } = restaurant;
  const now = new Date();
  const today = riyadhDate(now);
  const collection = getDb().collection(BOOKINGS);

  const [todays, upcoming, unseen] = await Promise.all([
    collection.find({ restaurantId, date: today, status: LIVE }, { projection: { party: 1 } }).toArray(),
    collection.find({ restaurantId, status: "confirmed", startsAt: { $gt: now } }).sort({ startsAt: 1 }).limit(5).toArray(),
    countUnseen(restaurantId, bookingsSeenAt),
  ]);

  // "Right now" is the half hour in progress, on the service that's running: at
  // 00:30 a place open past midnight is still on the previous date's service
  let seatsNow = null;
  const service = currentService(restaurant, now);
  if (service && booking?.capacity) {
    const day = await getDb()
      .collection(BOOKING_DAYS)
      .findOne({ restaurantId, date: service.date }, { projection: { seats: 1 } });
    const taken = day?.seats?.[service.slot] ?? 0;
    seatsNow = { taken, left: Math.max(booking.capacity - taken, 0) };
  }

  return {
    todayCount: todays.length,
    todayGuests: todays.reduce((sum, item) => sum + item.party, 0),
    seatsNow,
    upcoming: upcoming.map(toBookingView),
    unseen,
  };
}

// Regular expression characters in a search are plain text
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A customer gives a code, a name or a number at the door, on any day
export async function searchBookings(restaurantId, query) {
  const text = escapeRegex(query.trim().slice(0, 60));
  if (!text) return [];
  const digits = query.replace(/\D/g, "");
  const match = [{ code: text.toUpperCase() }, { name: { $regex: text, $options: "i" } }];
  if (digits.length >= 4) match.push({ phone: { $regex: digits.split("").join(" ?") } });

  const results = await getDb()
    .collection(BOOKINGS)
    .find({ restaurantId, $or: match })
    .sort({ startsAt: -1 })
    .limit(MAX_SEARCH_RESULTS)
    .toArray();
  return results.map(toBookingView);
}
