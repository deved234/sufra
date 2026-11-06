import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildIcs } from "@/lib/booking-ics";
import { addDays, availableSlots, bookableDates, daySlots, formatDate, isValidDate, riyadhDate, seatsWithout, slotsCovered, slotStart } from "@/lib/booking-slots";

test("the last slot leaves room for the whole sitting", () => {
  assert.deepEqual(daySlots([{ opens: "13:00", closes: "15:00" }], 90), ["13:00", "13:30"]);
});

test("hours can run past midnight", () => {
  assert.deepEqual(daySlots([{ opens: "22:00", closes: "01:00" }], 60), ["22:00", "22:30", "23:00", "23:30", "00:00"]);
});

test("slots align to the clock when opening isn't on a half hour", () => {
  assert.deepEqual(daySlots([{ opens: "13:15", closes: "15:00" }], 60), ["13:30", "14:00"]);
});

test("the same open and close time means open all day", () => {
  assert.equal(daySlots([{ opens: "00:00", closes: "00:00" }], 60).length, 47);
});

test("a booking's half hours roll past midnight", () => {
  assert.deepEqual(slotsCovered("23:30", 90), ["23:30", "00:00", "00:30"]);
});

test("a slot's start is in Riyadh time, across midnight too", () => {
  // 00:30 on the night of the 10th is on the 11th, at UTC+3
  assert.equal(slotStart("2026-11-10", "00:30", [{ opens: "13:00", closes: "01:00" }]).toISOString(), "2026-11-10T21:30:00.000Z");
  assert.equal(slotStart("2026-11-10", "19:00", [{ opens: "13:00", closes: "01:00" }]).toISOString(), "2026-11-10T16:00:00.000Z");
});

test("dates: Riyadh's today, month ends, invalid days", () => {
  assert.equal(riyadhDate(new Date("2026-11-05T21:30:00Z")), "2026-11-06");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(bookableDates(new Date("2026-11-05T10:00:00Z")).length, 31);
  assert.equal(isValidDate("2026-02-30"), false);
  assert.equal(isValidDate("2026-02-28"), true);
});

const booking = { capacity: 10, durationMinutes: 60 };
const base = { opens: "13:00", closes: "17:00", booking, date: "2026-11-10" };
const now = new Date("2026-11-10T11:10:00Z"); // 14:10 in Riyadh

test("bookings need an hour's notice: at 14:10, 15:30 is the first", () => {
  assert.equal(availableSlots({ ...base, now })[0].time, "15:30");
});

test("seats left is the fullest half hour the sitting covers", () => {
  const seats = { "16:00": 8, "15:30": 2 };
  const left = Object.fromEntries(availableSlots({ ...base, seats, now }).map((slot) => [slot.time, slot.left]));
  assert.equal(left["15:30"], 2, "15:30 covers 16:00 too");
  assert.equal(left["16:00"], 2);
});

test("a booking's own seats can be left out when moving it", () => {
  assert.deepEqual(seatsWithout({ "19:00": 6 }, { slots: ["19:00", "19:30"], party: 4 }), { "19:00": 2, "19:30": 0 });
});

test("dates are Gregorian with Western digits in Arabic", () => {
  assert.equal(formatDate("2026-11-10", "en"), "Tuesday, November 10");
  assert.match(formatDate("2026-11-10", "ar"), /10 نوفمبر/);
});

test("the calendar file has UTC times, escaped text and CRLF lines", () => {
  const ics = buildIcs({ id: "abc", startsAt: "2026-11-10T16:00:00.000Z", minutes: 90, title: "Table, at; X", location: "St", description: "Code: A" });
  assert.match(ics, /DTSTART:20261110T160000Z\r\n/);
  assert.match(ics, /DTEND:20261110T173000Z\r\n/);
  assert.match(ics, /SUMMARY:Table\\, at\\; X\r\n/);
});
