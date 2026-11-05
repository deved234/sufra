// Booking time math, shared by the booking page and the server. Plain functions with
// no database or React, like menu-ops.js. Dates are "YYYY-MM-DD" and times "HH:MM",
// both in Riyadh time, which is UTC+3 all year.

export const SLOT_MINUTES = 30;
// A kitchen needs notice, and a table a few weeks out is as far as a plan goes
export const LEAD_MINUTES = 60;
export const DAYS_AHEAD = 30;
export const DURATIONS = [60, 90, 120, 150, 180];
// Starting values for the settings form. No capacity: only the owner knows their seats.
export const DEFAULT_BOOKING = { enabled: false, capacity: "", durationMinutes: 90, maxParty: 12 };

const DAY_MINUTES = 24 * 60;
const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (minutes) => {
  const inDay = minutes % DAY_MINUTES;
  return `${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`;
};

// Minutes after the service day's midnight. Past midnight keeps counting up, so
// 13:00 to 01:00 is 780 to 1500. The same open and close time means open all day.
function serviceHours(opens, closes) {
  const start = toMinutes(opens);
  const end = toMinutes(closes);
  return { start, end: end <= start ? end + DAY_MINUTES : end };
}

// Bookings on a clock half hour whatever the opening time. If an owner later changes
// the hours, seats already counted under "19:00" still line up with the new slots.
export function daySlots({ opens, closes }, durationMinutes) {
  const { start, end } = serviceHours(opens, closes);
  const slots = [];
  for (let m = Math.ceil(start / SLOT_MINUTES) * SLOT_MINUTES; m + durationMinutes <= end; m += SLOT_MINUTES) {
    slots.push(toTime(m));
  }
  return slots;
}

// Every half hour a booking keeps its seats taken: 90 minutes from 19:00 is
// 19:00, 19:30 and 20:00
export function slotsCovered(time, durationMinutes) {
  const start = toMinutes(time);
  const covered = [];
  for (let m = 0; m < durationMinutes; m += SLOT_MINUTES) covered.push(toTime(start + m));
  return covered;
}

// The moment a slot starts. A time before opening belongs to the night that began
// on `date`, so 00:30 on a 13:00 to 01:00 service is on the next calendar day.
export function slotStart(date, time, opens) {
  const [y, m, d] = date.split("-").map(Number);
  const minutes = toMinutes(time);
  const nextDay = minutes < toMinutes(opens) ? DAY_MINUTES : 0;
  return new Date(Date.UTC(y, m - 1, d, 0, minutes + nextDay) - RIYADH_OFFSET_MS);
}

export function riyadhDate(now = new Date()) {
  return new Date(now.getTime() + RIYADH_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date, days) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Today and the days after it that can be booked
export function bookableDates(now = new Date()) {
  const today = riyadhDate(now);
  return Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => addDays(today, i));
}

export const isValidDate = (date) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

// Each slot of a day with the seats left for this party: `seats` is what is taken so
// far, per half hour. A booking fits only if it fits in every half hour it covers.
export function availableSlots({ opens, closes, booking, date, seats = {}, now = new Date() }) {
  const earliest = now.getTime() + LEAD_MINUTES * 60 * 1000;
  return daySlots({ opens, closes }, booking.durationMinutes)
    .filter((time) => slotStart(date, time, opens).getTime() >= earliest)
    .map((time) => {
      const fullest = Math.max(...slotsCovered(time, booking.durationMinutes).map((slot) => seats[slot] ?? 0));
      return { time, left: Math.max(booking.capacity - fullest, 0) };
    });
}

// The seats of a day without one booking's share, to judge moving that booking
export function seatsWithout(seats, { slots, party }) {
  const rest = { ...seats };
  for (const slot of slots) rest[slot] = Math.max((rest[slot] ?? 0) - party, 0);
  return rest;
}

// The service running right now and its half hour, or null while closed. Past
// midnight it's still the previous date's service.
export function currentService({ opens, closes }, now = new Date()) {
  const { start, end } = serviceHours(opens, closes);
  const riyadh = new Date(now.getTime() + RIYADH_OFFSET_MS);
  const minutes = riyadh.getUTCHours() * 60 + riyadh.getUTCMinutes();
  const today = riyadh.toISOString().slice(0, 10);
  const date = minutes >= start && minutes < end ? today : minutes + DAY_MINUTES < end ? addDays(today, -1) : null;
  return date && { date, slot: toTime(Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES) };
}

// "الثلاثاء 10 نوفمبر" / "Tuesday, November 10". The Gregorian calendar and Western
// digits are set outright: an Arabic locale could otherwise pick others.
export function formatDate(date, locale, options = { weekday: "long", day: "numeric", month: "long" }) {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(`${locale}-u-ca-gregory-nu-latn`, { timeZone: "UTC", ...options }).format(new Date(Date.UTC(y, m - 1, d)));
}
