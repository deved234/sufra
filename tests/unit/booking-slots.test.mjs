import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildIcs } from "@/lib/booking-ics";
import { addDays, availableSlots, bookableDates, canSetStatus, daySlots, formatDate, heldSlots, isValidDate, releasedAfter, riyadhDate, seatsWithout, slotsAfter, slotsCovered, slotStart } from "@/lib/booking-slots";

// 19:00 Riyadh on November 10, for 90 minutes
const dinner = { status: "confirmed", date: "2026-11-10", slots: ["19:00", "19:30", "20:00"], startsAt: new Date("2026-11-10T16:00:00Z") };
const riyadh = (clock, day = "10") => new Date(`2026-11-${day}T${clock}:00+03:00`);

test("the half hours ahead of a booking don't include the one in progress", () => {
  assert.deepEqual(slotsAfter(dinner, riyadh("18:00")), dinner.slots);
  assert.deepEqual(slotsAfter(dinner, riyadh("19:00")), ["19:30", "20:00"]);
  assert.deepEqual(slotsAfter(dinner, riyadh("19:40")), ["20:00"]);
  assert.deepEqual(slotsAfter(dinner, riyadh("21:00")), []);
});

test("the half hours ahead come out right across midnight", () => {
  const late = { slots: ["23:30", "00:00", "00:30"], startsAt: new Date("2026-11-10T20:30:00Z") };
  assert.deepEqual(slotsAfter(late, riyadh("23:45")), ["00:00", "00:30"]);
  assert.deepEqual(slotsAfter(late, riyadh("00:10", "11")), ["00:30"]);
});

test("a booking without a list of returned half hours still holds them all", () => {
  assert.deepEqual(heldSlots(dinner), dinner.slots);
  assert.deepEqual(heldSlots({ ...dinner, releasedSlots: ["20:00"] }), ["19:00", "19:30"]);
});

test("no-show and completed have to wait for the booking's time", () => {
  for (const next of ["noShow", "completed"]) {
    assert.equal(canSetStatus(dinner, next, riyadh("18:59")), false);
    assert.equal(canSetStatus(dinner, next, riyadh("19:00")), true);
  }
});

test("guests can be seated early on the day, but not the day before", () => {
  assert.equal(canSetStatus(dinner, "seated", riyadh("23:00", "09")), false);
  assert.equal(canSetStatus(dinner, "seated", riyadh("12:00")), true);
});

test("past midnight is still the service that began the night before", () => {
  const late = { ...dinner, slots: ["00:30", "01:00"], startsAt: new Date("2026-11-10T21:30:00Z") };
  assert.equal(canSetStatus(late, "seated", riyadh("00:20", "11")), true);
  assert.equal(canSetStatus(late, "noShow", riyadh("00:20", "11")), false);
  assert.equal(canSetStatus(late, "noShow", riyadh("00:40", "11")), true);
});

test("an owner cancels only what is still going and hasn't finished", () => {
  assert.equal(canSetStatus(dinner, "cancelled", riyadh("18:00")), true);
  assert.equal(canSetStatus({ ...dinner, status: "seated" }, "cancelled", riyadh("20:00")), true);
  assert.equal(canSetStatus(dinner, "cancelled", riyadh("20:30")), false);
  assert.equal(canSetStatus({ ...dinner, status: "completed" }, "cancelled", riyadh("20:00")), false);
  assert.equal(canSetStatus({ ...dinner, status: "noShow" }, "cancelled", riyadh("20:00")), false);
});

test("a mistake can be undone, but a cancelled booking stays cancelled", () => {
  for (const status of ["noShow", "completed", "seated"]) assert.equal(canSetStatus({ ...dinner, status }, "confirmed", riyadh("22:00")), true);
  for (const next of ["confirmed", "seated", "completed", "noShow"]) assert.equal(canSetStatus({ ...dinner, status: "cancelled" }, next, riyadh("22:00")), false);
  assert.equal(canSetStatus(dinner, "confirmed", riyadh("22:00")), false);
});

test("each status gives back the right half hours", () => {
  assert.deepEqual(releasedAfter(dinner, "noShow", riyadh("19:10")), dinner.slots);
  assert.deepEqual(releasedAfter(dinner, "completed", riyadh("19:40")), ["20:00"]);
  assert.deepEqual(releasedAfter(dinner, "seated", riyadh("19:40")), []);
  // Finishing after a no-show takes nothing back: those half hours have gone
  assert.deepEqual(releasedAfter({ ...dinner, status: "noShow", releasedSlots: dinner.slots }, "completed", riyadh("19:40")), dinner.slots);
});

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
