// Booking time math, shared by the booking page and the server. Plain functions with
// no database or React, like menu-ops.js. Dates are "YYYY-MM-DD" and times "HH:MM",
// both in Riyadh time, which is UTC+3 all year.

import { addDays, isBookableDate, periodBounds, periodsForDate, riyadhDate, riyadhMinutesNow, toMinutes } from "@/lib/opening-hours";

export { addDays, riyadhDate };

export const SLOT_MINUTES = 30;
// A kitchen needs notice, and a table a few weeks out is as far as a plan goes
export const LEAD_MINUTES = 60;
export const DAYS_AHEAD = 30;
export const DURATIONS = [60, 90, 120, 150, 180];
// Starting values for the settings form. No capacity: only the owner knows their seats.
export const DEFAULT_BOOKING = { enabled: false, capacity: "", durationMinutes: 90, maxParty: 12 };

const DAY_MINUTES = 24 * 60;
const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

const toTime = (minutes) => {
  const inDay = minutes % DAY_MINUTES;
  return `${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`;
};

// The start times of a day with these periods. A sitting must end inside its period,
// so nobody is seated into the gap between lunch and dinner. Bookings sit on a clock
// half hour whatever the opening time: if an owner later changes the hours, seats
// already counted under "19:00" still line up with the new slots.
export function daySlots(periods, durationMinutes) {
  const slots = [];
  for (const period of periods) {
    const { start, end } = periodBounds(period);
    for (let m = Math.ceil(start / SLOT_MINUTES) * SLOT_MINUTES; m + durationMinutes <= end; m += SLOT_MINUTES) {
      slots.push(toTime(m));
    }
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

// The moment a slot starts. A time before the day's first opening belongs to the night
// that began on `date`, so 00:30 on a 13:00 to 01:00 service is on the next calendar day.
export function slotStart(date, time, periods) {
  const [y, m, d] = date.split("-").map(Number);
  const minutes = toMinutes(time);
  const nextDay = periods[0] && minutes < toMinutes(periods[0].opens) ? DAY_MINUTES : 0;
  return new Date(Date.UTC(y, m - 1, d, 0, minutes + nextDay) - RIYADH_OFFSET_MS);
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
export function availableSlots({ booking, date, seats = {}, now = new Date(), ...schedule }) {
  if (!isBookableDate(schedule, date)) return [];
  const periods = periodsForDate(schedule, date);
  const earliest = now.getTime() + LEAD_MINUTES * 60 * 1000;
  return daySlots(periods, booking.durationMinutes)
    .filter((time) => slotStart(date, time, periods).getTime() >= earliest)
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

const slotStartMs = (startsAt, index) => new Date(startsAt).getTime() + index * SLOT_MINUTES * 60 * 1000;

// The half hours of a booking that haven't started yet. Counted from its start, not by
// comparing clock times, so a night running past midnight comes out right.
export function slotsAfter({ slots, startsAt }, now = new Date()) {
  return slots.filter((_, index) => slotStartMs(startsAt, index) > now.getTime());
}

// The half hours whose seats a booking still holds. Older bookings have no list of
// returned half hours, and hold them all.
export function heldSlots({ slots, releasedSlots = [] }) {
  return slots.filter((slot) => !releasedSlots.includes(slot));
}

// Whether an owner may move a booking to this status now. The server enforces it, and
// the board uses it to offer only what would work.
export function canSetStatus(booking, next, now = new Date()) {
  const { status, date, startsAt, slots } = booking;
  if (status === "cancelled" || status === next) return false;
  const started = new Date(startsAt).getTime() <= now.getTime();
  switch (next) {
    // Going back to it undoes a mistake, whenever that's noticed
    case "confirmed":
      return true;
    // Guests may come early, but not on another day
    case "seated":
      return riyadhDate(now) >= date;
    case "completed":
    case "noShow":
      return started;
    case "cancelled":
      return (status === "confirmed" || status === "seated") && now.getTime() < slotStartMs(startsAt, slots.length);
    default:
      return false;
  }
}

// The half hours a booking has given back once it has this status. No-show frees the
// table. Finishing frees what's ahead, while the current half hour goes to clearing the
// table. A booking back in play holds them all again.
export function releasedAfter(booking, next, now = new Date()) {
  if (next === "noShow") return booking.slots;
  if (next === "completed") return booking.slots.filter((slot) => booking.releasedSlots?.includes(slot) || slotsAfter(booking, now).includes(slot));
  return [];
}

// The service running right now and its half hour, or null while closed. Past
// midnight it's still the previous date's service.
export function currentService(schedule, now = new Date()) {
  const minutes = riyadhMinutesNow(now);
  const today = riyadhDate(now);
  const slot = toTime(Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES);
  const yesterday = addDays(today, -1);
  if (periodsForDate(schedule, yesterday).some((period) => minutes + DAY_MINUTES < periodBounds(period).end)) return { date: yesterday, slot };
  const running = periodsForDate(schedule, today).some((period) => {
    const { start, end } = periodBounds(period);
    return minutes >= start && minutes < end;
  });
  return running ? { date: today, slot } : null;
}

// "الثلاثاء 10 نوفمبر" / "Tuesday, November 10". The Gregorian calendar and Western
// digits are set outright: an Arabic locale could otherwise pick others.
export function formatDate(date, locale, options = { weekday: "long", day: "numeric", month: "long" }) {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(`${locale}-u-ca-gregory-nu-latn`, { timeZone: "UTC", ...options }).format(new Date(Date.UTC(y, m - 1, d)));
}
