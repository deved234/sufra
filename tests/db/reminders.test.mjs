// Which bookings get a reminder, asked of a real database, and what two runs at once do.
import { strict as assert } from "node:assert";
import { after, test } from "node:test";
import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { applyBookingChange } from "@/lib/booking/change";
import { sendDueReminders } from "@/lib/booking/reminders";
import { reserveSeats } from "@/lib/booking/seats";
import { addDays, riyadhDate, slotStart } from "@/lib/booking-slots";
import { refuseLiveDatabase } from "./guard.mjs";

refuseLiveDatabase();

const HOUR = 60 * 60 * 1000;
const bookings = () => getDb().collection("bookings");
const restaurants = () => getDb().collection("restaurants");
const made = [];

after(async () => {
  await bookings().deleteMany({ restaurantId: { $in: made } });
  await getDb().collection("bookingDays").deleteMany({ restaurantId: { $in: made } });
  await restaurants().deleteMany({ _id: { $in: made } });
  await globalThis.sufraMongo.close();
});

async function newRestaurant(extra = {}) {
  const label = { ar: "مطعم تجربة", en: "Test place" };
  const slug = `e2e-reminders-${new ObjectId()}`;
  const { insertedId } = await restaurants().insertOne({
    slug,
    name: label,
    tagline: label,
    cuisine: label,
    city: label,
    address: label,
    phone: "+966 13 555 0142",
    opens: "13:00",
    closes: "01:00",
    accent: "#2E7D5B",
    menu: [],
    ownerIds: [],
    createdAt: new Date(),
    status: "published",
    ...extra,
  });
  made.push(insertedId);
  return insertedId;
}

async function newBooking(restaurantId, extra = {}) {
  const now = Date.now();
  const doc = {
    restaurantId,
    userId: new ObjectId(),
    source: "online",
    date: addDays(riyadhDate(), 1),
    time: "19:00",
    slots: ["19:00"],
    startsAt: new Date(now + 10 * HOUR),
    party: 2,
    name: "Test customer",
    email: `reminder_${new ObjectId()}@sufra.test`,
    phone: "0512345678",
    status: "confirmed",
    code: new ObjectId().toString(),
    locale: "en",
    createdAt: new Date(now - 24 * HOUR),
    updatedAt: new Date(now - 24 * HOUR),
    ...extra,
  };
  const { insertedId } = await bookings().insertOne(doc);
  return insertedId;
}

// A run that records who it would have emailed, and only ever counts these tests' bookings
async function run(options = {}) {
  const sent = [];
  const result = await sendDueReminders({ send: async (booking) => sent.push(booking._id.toString()), ...options });
  return { ...result, sent };
}
const stored = (id) => bookings().findOne({ _id: id });

test("only what's due gets a reminder", async () => {
  const restaurant = await newRestaurant();
  const now = Date.now();
  const due = await newBooking(restaurant);
  const lastMinute = await newBooking(restaurant, { startsAt: new Date(now + 24.5 * HOUR) });
  const notDue = {
    "too far off": await newBooking(restaurant, { startsAt: new Date(now + 26 * HOUR) }),
    "already started": await newBooking(restaurant, { startsAt: new Date(now - HOUR) }),
    "made just now": await newBooking(restaurant, { createdAt: new Date(now - HOUR) }),
    "reminded already": await newBooking(restaurant, { reminderSentAt: new Date(now - HOUR) }),
    "cancelled": await newBooking(restaurant, { status: "cancelled" }),
    "seated": await newBooking(restaurant, { status: "seated" }),
    "taken by phone": await newBooking(restaurant, { userId: null, source: "owner", email: null }),
    "account deleted": await newBooking(restaurant, { userId: null, email: null }),
  };

  const { sent } = await run();
  assert.ok(sent.includes(due.toString()));
  assert.ok(sent.includes(lastMinute.toString()));
  for (const [why, id] of Object.entries(notDue)) assert.equal(sent.includes(id.toString()), false, why);
  assert.ok((await stored(due)).reminderSentAt instanceof Date);
  assert.equal((await stored(notDue["too far off"])).reminderSentAt, undefined);
});

test("a restaurant visitors can't see sends nothing, and keeps its bookings unclaimed", async () => {
  for (const status of ["hidden", "suspended", "deleted", "draft"]) {
    const id = await newBooking(await newRestaurant({ status }));
    const { sent } = await run();
    assert.equal(sent.includes(id.toString()), false, status);
    assert.equal((await stored(id)).reminderSentAt, undefined, status);
  }
});

test("a restaurant older than the status field counts as open", async () => {
  const restaurant = await newRestaurant();
  await restaurants().updateOne({ _id: restaurant }, { $unset: { status: "" } });
  const id = await newBooking(restaurant);
  assert.ok((await run()).sent.includes(id.toString()));
});

test("running again sends nothing twice", async () => {
  const id = await newBooking(await newRestaurant());
  assert.ok((await run()).sent.includes(id.toString()));
  assert.equal((await run()).sent.includes(id.toString()), false);
});

test("five runs at once send each reminder exactly once", async () => {
  const restaurant = await newRestaurant();
  const ids = await Promise.all(Array.from({ length: 20 }, () => newBooking(restaurant)));
  const runs = await Promise.all(Array.from({ length: 5 }, () => run()));
  const sent = runs.flatMap((result) => result.sent);
  for (const id of ids) assert.equal(sent.filter((one) => one === id.toString()).length, 1);
});

test("a run stops at its limit, and the next one carries on, soonest first", async () => {
  const restaurant = await newRestaurant();
  const now = Date.now();
  const soonest = await newBooking(restaurant, { startsAt: new Date(now + 60_000) });
  const later = await newBooking(restaurant, { startsAt: new Date(now + 90_000) });
  const first = await run({ limit: 1 });
  assert.deepEqual(first, { reminded: 1, sent: [soonest.toString()] });
  assert.equal((await stored(later)).reminderSentAt, undefined);
  assert.ok((await run()).sent.includes(later.toString()));
});

test("a run out of time stops before claiming anything else", async () => {
  const id = await newBooking(await newRestaurant());
  const { reminded } = await run({ timeLimitMs: 0 });
  assert.equal(reminded, 0);
  assert.equal((await stored(id)).reminderSentAt, undefined);
  await run();
});

test("a booking cancelled while waiting its turn isn't claimed", async () => {
  const restaurant = await newRestaurant();
  const now = Date.now();
  await newBooking(restaurant, { startsAt: new Date(now + 30_000) });
  const cancelled = await newBooking(restaurant, { startsAt: new Date(now + 40_000) });
  const { sent } = await sendAndCancel(cancelled);
  assert.equal(sent.includes(cancelled.toString()), false);
  assert.equal((await stored(cancelled)).reminderSentAt, undefined);
});

// The email before it goes out takes long enough for the customer to cancel the next one
async function sendAndCancel(id) {
  const sent = [];
  await sendDueReminders({
    send: async (booking) => {
      sent.push(booking._id.toString());
      await bookings().updateOne({ _id: id }, { $set: { status: "cancelled" } });
    },
  });
  return { sent };
}

test("moving a reminded booking to a new time earns a new reminder", async () => {
  const restaurantId = await newRestaurant();
  const date = addDays(riyadhDate(), 1);
  const periods = [{ opens: "13:00", closes: "01:00" }];
  const booking = { restaurantId, date, time: "14:00", slots: ["14:00"], party: 2, startsAt: slotStart(date, "14:00", periods), reminderSentAt: new Date() };
  await reserveSeats({ restaurantId, date, slots: booking.slots, party: 2, capacity: 20 });
  const _id = await newBooking(restaurantId, booking);

  const later = { date, time: "20:00", slots: ["20:00"], party: 2, startsAt: slotStart(date, "20:00", periods) };
  assert.deepEqual(await applyBookingChange({ booking: { ...booking, _id }, change: later, capacity: 20, filter: { status: "confirmed" } }), { ok: true });
  assert.equal((await stored(_id)).reminderSentAt, undefined);
});

test("changing only the party size keeps the reminder as sent", async () => {
  const restaurantId = await newRestaurant();
  const date = addDays(riyadhDate(), 1);
  const startsAt = slotStart(date, "14:00", [{ opens: "13:00", closes: "01:00" }]);
  const booking = { restaurantId, date, time: "14:00", slots: ["14:00"], party: 2, startsAt, reminderSentAt: new Date() };
  await reserveSeats({ restaurantId, date, slots: booking.slots, party: 2, capacity: 20 });
  const _id = await newBooking(restaurantId, booking);

  // The same moment from another Date object, as a stored proposal gives
  const change = { date, time: "14:00", slots: ["14:00"], party: 4, startsAt: new Date(startsAt.getTime()) };
  assert.deepEqual(await applyBookingChange({ booking: { ...booking, _id }, change, capacity: 20, filter: { status: "confirmed" } }), { ok: true });
  assert.ok((await stored(_id)).reminderSentAt instanceof Date);
  assert.equal((await stored(_id)).party, 4);
});
