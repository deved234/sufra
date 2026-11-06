import { strict as assert } from "node:assert";
import { test } from "node:test";
import { availableSlots, currentService, daySlots, slotStart } from "@/lib/booking-slots";
import { everyDay, exceptionFor, isBookableDate, openStateAt, periodsForDate } from "@/lib/opening-hours";
import { periodsProblem } from "@/lib/validation/schedule";

// 2026-11-08 is a Sunday. Riyadh is UTC+3, so at() takes Riyadh wall clock.
const at = (date, time) => new Date(`${date}T${time}:00+03:00`);
const lunchDinner = [
  { opens: "12:00", closes: "16:00" },
  { opens: "19:00", closes: "01:00" },
];
const week = Array.from({ length: 7 }, () => ({ periods: lunchDinner }));
week[1] = { periods: [] }; // closed Mondays
const restaurant = { weeklyHours: week, exceptions: [] };
const open = (date, time, schedule = restaurant) => openStateAt(schedule, at(date, time));

test("hours go by weekday, and old restaurants fall back to one period", () => {
  assert.deepEqual(periodsForDate(restaurant, "2026-11-08"), lunchDinner);
  assert.deepEqual(periodsForDate(restaurant, "2026-11-09"), []);
  assert.deepEqual(periodsForDate({ opens: "13:00", closes: "01:00" }, "2026-11-09"), [{ opens: "13:00", closes: "01:00" }]);
});

test("a sitting ends inside its period, and there are no slots in the gap", () => {
  const slots = daySlots(lunchDinner, 90);
  assert.equal(slots.includes("14:30"), true);
  assert.equal(slots.includes("15:00"), false);
  assert.equal(slots.some((time) => time >= "16:00" && time < "19:00"), false);
  assert.equal(slots.includes("19:00"), true);
  assert.equal(slots.includes("23:30"), true);
  assert.equal(slots.includes("00:00"), false);
});

test("start times with two periods: 00:30 is the next calendar day, 12:00 isn't", () => {
  assert.equal(slotStart("2026-11-08", "12:00", lunchDinner).toISOString(), "2026-11-08T09:00:00.000Z");
  assert.equal(slotStart("2026-11-08", "00:30", lunchDinner).toISOString(), "2026-11-08T21:30:00.000Z");
});

test("open in a period, closed in the gap with the next opening", () => {
  assert.deepEqual(open("2026-11-08", "13:00"), { open: true, closes: "16:00" });
  assert.deepEqual(open("2026-11-08", "17:00"), { open: false, opens: "19:00", days: 0 });
  assert.deepEqual(open("2026-11-08", "20:00"), { open: true, closes: "01:00" });
});

test("past midnight counts as yesterday's service, and a closed day points to tomorrow", () => {
  assert.deepEqual(open("2026-11-09", "00:30"), { open: true, closes: "01:00" });
  assert.deepEqual(open("2026-11-09", "10:00"), { open: false, opens: "12:00", days: 1, date: "2026-11-10" });
});

test("a restaurant closed all week says so", () => {
  const closed = { weeklyHours: Array.from({ length: 7 }, () => ({ periods: [] })) };
  assert.deepEqual(open("2026-11-08", "13:00", closed), { open: false });
});

test("the same open and close time means all day", () => {
  assert.equal(openStateAt({ weeklyHours: everyDay("00:00", "00:00") }, at("2026-11-08", "03:00")).open, true);
});

const withExceptions = {
  weeklyHours: week,
  exceptions: [
    { id: "1", from: "2026-11-10", to: "2026-11-12", type: "closed" },
    { id: "2", from: "2026-11-15", to: "2026-11-15", type: "noBooking" },
    { id: "3", from: "2026-11-20", to: "2026-11-25", type: "hours", opens: "20:00", closes: "03:00" },
  ],
};

test("exceptions: closed, no bookings, and different hours like Ramadan", () => {
  assert.deepEqual(periodsForDate(withExceptions, "2026-11-11"), []);
  assert.equal(isBookableDate(withExceptions, "2026-11-11"), false);
  assert.equal(periodsForDate(withExceptions, "2026-11-15").length, 2);
  assert.equal(isBookableDate(withExceptions, "2026-11-15"), false);
  assert.deepEqual(periodsForDate(withExceptions, "2026-11-21"), [{ opens: "20:00", closes: "03:00" }]);
  assert.equal(isBookableDate(withExceptions, "2026-11-21"), true);
  assert.equal(exceptionFor(withExceptions, "2026-11-13"), null);
});

test("availability follows the exceptions", () => {
  const now = at("2026-11-05", "10:00");
  const booking = { capacity: 10, durationMinutes: 90 };
  assert.deepEqual(availableSlots({ ...withExceptions, booking, date: "2026-11-11", now }), []);
  assert.deepEqual(availableSlots({ ...withExceptions, booking, date: "2026-11-15", now }), []);
  assert.equal(availableSlots({ ...withExceptions, booking, date: "2026-11-21", now })[0].time, "20:00");
  assert.equal(availableSlots({ ...withExceptions, booking, date: "2026-11-09", now }).length, 0);
});

test("the open badge follows exceptions, and a no-booking day is still open", () => {
  assert.deepEqual(openStateAt(withExceptions, at("2026-11-21", "02:00")), { open: true, closes: "03:00" });
  assert.equal(openStateAt(withExceptions, at("2026-11-15", "13:00")).open, true);
});

test("the running service: past midnight, and none in the gap", () => {
  assert.deepEqual(currentService(restaurant, at("2026-11-08", "20:10")), { date: "2026-11-08", slot: "20:00" });
  assert.deepEqual(currentService(restaurant, at("2026-11-09", "00:40")), { date: "2026-11-08", slot: "00:30" });
  assert.equal(currentService(restaurant, at("2026-11-08", "17:00")), null);
});

test("the running service with one period", () => {
  const hours = { opens: "13:00", closes: "01:00" };
  assert.deepEqual(currentService(hours, new Date("2026-11-10T21:40:00Z")), { date: "2026-11-10", slot: "00:30" });
  assert.deepEqual(currentService(hours, new Date("2026-11-10T16:10:00Z")), { date: "2026-11-10", slot: "19:00" });
  assert.equal(currentService(hours, new Date("2026-11-10T05:00:00Z")), null);
});

test("period rules: overlap, wrong order, wrapping into the first, bad times", () => {
  assert.equal(periodsProblem(lunchDinner), null);
  assert.equal(periodsProblem([{ opens: "12:00", closes: "16:00" }, { opens: "15:00", closes: "20:00" }]), "periodsOverlap");
  assert.equal(periodsProblem([{ opens: "19:00", closes: "01:00" }, { opens: "12:00", closes: "16:00" }]), "periodsOverlap");
  assert.equal(periodsProblem([{ opens: "12:00", closes: "16:00" }, { opens: "19:00", closes: "13:00" }]), "periodsOverlap");
  assert.equal(periodsProblem([{ opens: "12:00", closes: "bad" }]), "timeInvalid");
  assert.equal(periodsProblem([{ opens: "19:00", closes: "01:00" }]), null);
});
