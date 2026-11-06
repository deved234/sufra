import { seedRestaurants } from "@/db/seed-data";
import { addDays, riyadhDate, slotsCovered, slotStart } from "@/lib/booking-slots";
import { everyDay, periodsForDate } from "@/lib/opening-hours";

// What a new demo account starts with. Plain data, written by create.js.

const BOOKING = { enabled: true, capacity: 40, durationMinutes: 90, maxParty: 12 };
const SOURCE = seedRestaurants[0];

// A copy of a demo restaurant. It stays hidden, so visitors never see it, and takes its
// dish photos from the original, since those are files named after that restaurant.
export function sampleRestaurant({ slug, ownerId, expiresAt, now }) {
  return {
    ...SOURCE,
    slug,
    status: "hidden",
    photosFrom: SOURCE.slug,
    weeklyHours: everyDay(SOURCE.opens, SOURCE.closes),
    booking: BOOKING,
    menu: SOURCE.menu.map((category) => ({ ...category, items: category.items.map((dish) => ({ tags: [], ...dish })) })),
    ownerIds: [ownerId],
    createdAt: now,
    demoExpiresAt: expiresAt,
  };
}

// [days from today, time, party, name, note]
const GUESTS = [
  [0, "13:00", 2, { ar: "محمد العتيبي", en: "Mohammed Alotaibi" }],
  [0, "14:30", 4, { ar: "سارة القحطاني", en: "Sara Alqahtani" }, { ar: "نحتاج كرسي أطفال", en: "We need a high chair" }],
  [0, "19:00", 6, { ar: "عبدالله الشمري", en: "Abdullah Alshammari" }],
  [0, "21:00", 3, { ar: "نورة الدوسري", en: "Noura Aldossari" }],
  [1, "13:30", 2, { ar: "فهد الغامدي", en: "Fahad Alghamdi" }],
  [1, "20:00", 8, { ar: "ريم الزهراني", en: "Reem Alzahrani" }, { ar: "عيد ميلاد", en: "A birthday" }],
];

// Bookings as if taken by phone, so nobody stands behind them: no account and no email,
// which also keeps them out of reminders. Those whose time has passed are done.
export function sampleBookings({ restaurantId, restaurant, locale, expiresAt, now }) {
  const today = riyadhDate(now);
  return GUESTS.map(([days, time, party, name, note], index) => {
    const date = addDays(today, days);
    const startsAt = slotStart(date, time, periodsForDate(restaurant, date));
    return {
      restaurantId,
      userId: null,
      source: "owner",
      date,
      time,
      slots: slotsCovered(time, BOOKING.durationMinutes),
      startsAt,
      party,
      name: name[locale],
      email: null,
      phone: `05000000${String(index + 1).padStart(2, "0")}`,
      ...(note && { note: note[locale] }),
      status: startsAt < now ? "completed" : "confirmed",
      code: `D${index + 1}${restaurantId.toString().slice(-4).toUpperCase()}`,
      locale,
      createdAt: now,
      updatedAt: now,
      demoExpiresAt: expiresAt,
    };
  });
}
