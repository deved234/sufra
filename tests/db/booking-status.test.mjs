// A booking's status and its seats moving together, on a real database
import { strict as assert } from "node:assert";
import { after, test } from "node:test";
import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { getSeats, reserveSeats } from "@/lib/booking/seats";
import { cancelBooking, changeBookingStatus } from "@/lib/booking/status";
import { refuseLiveDatabase } from "./guard.mjs";

refuseLiveDatabase();

const bookings = () => getDb().collection("bookings");
const days = () => getDb().collection("bookingDays");
const made = [];

const date = "2031-03-10";
const slots = ["19:00", "19:30", "20:00"];
const startsAt = new Date(`${date}T16:00:00Z`);
const at = (clock) => new Date(`${date}T${clock}:00+03:00`);
const CAPACITY = 10;

async function newBooking(extra = {}) {
  const restaurantId = new ObjectId();
  made.push(restaurantId);
  await reserveSeats({ restaurantId, date, slots, party: 4, capacity: CAPACITY });
  const now = new Date();
  const doc = { restaurantId, userId: null, source: "owner", date, time: "19:00", slots, startsAt, party: 4, name: "Test", email: null, phone: "0512345678", status: "confirmed", code: new ObjectId().toString().slice(-6), locale: "ar", createdAt: now, updatedAt: now, ...extra };
  const { insertedId } = await bookings().insertOne(doc);
  return { ...doc, _id: insertedId };
}
const reload = (booking) => bookings().findOne({ _id: booking._id });
const change = (booking, next, now, extra = {}) => changeBookingStatus({ booking, next, capacity: CAPACITY, now, ...extra });

after(async () => {
  await bookings().deleteMany({ restaurantId: { $in: made } });
  await days().deleteMany({ restaurantId: { $in: made } });
  await globalThis.sufraMongo.close();
});

test("a no-show gives every seat back, and undoing it takes them again", async () => {
  const booking = await newBooking();
  assert.deepEqual(await change(booking, "noShow", at("19:20")), { ok: true });
  const noShow = await reload(booking);
  assert.equal(noShow.status, "noShow");
  assert.deepEqual(noShow.releasedSlots, slots);
  assert.deepEqual(await getSeats(booking.restaurantId, date), { "19:00": 0, "19:30": 0, "20:00": 0 });

  assert.deepEqual(await change(noShow, "seated", at("19:30")), { ok: true });
  const seated = await reload(booking);
  assert.equal(seated.status, "seated");
  assert.equal(seated.releasedSlots, undefined);
  assert.deepEqual(await getSeats(booking.restaurantId, date), { "19:00": 4, "19:30": 4, "20:00": 4 });
});

test("finishing returns only the half hours ahead", async () => {
  const booking = await newBooking({ status: "seated" });
  await change(booking, "completed", at("19:40"));
  const completed = await reload(booking);
  assert.deepEqual(completed.releasedSlots, ["20:00"]);
  assert.deepEqual(await getSeats(booking.restaurantId, date), { "19:00": 4, "19:30": 4, "20:00": 0 });

  await change(completed, "seated", at("19:45"));
  assert.deepEqual(await getSeats(booking.restaurantId, date), { "19:00": 4, "19:30": 4, "20:00": 4 });
});

test("going from no-show to completed doesn't count anything twice", async () => {
  const booking = await newBooking();
  await change(booking, "noShow", at("19:20"));
  await change(await reload(booking), "completed", at("20:40"));
  assert.deepEqual((await reload(booking)).releasedSlots, slots);
  assert.deepEqual(await getSeats(booking.restaurantId, date), { "19:00": 0, "19:30": 0, "20:00": 0 });
});

test("undoing with the seats taken is refused and leaves everything as it was", async () => {
  const booking = await newBooking();
  await change(booking, "noShow", at("19:20"));
  const noShow = await reload(booking);
  assert.equal(await reserveSeats({ restaurantId: booking.restaurantId, date, slots: ["20:00"], party: 8, capacity: CAPACITY }), true);

  assert.deepEqual(await change(noShow, "confirmed", at("19:30")), { error: "statusNoRoom" });
  const after = await reload(booking);
  assert.equal(after.status, "noShow");
  assert.deepEqual(after.releasedSlots, slots);
  assert.deepEqual(await getSeats(booking.restaurantId, date), { "19:00": 0, "19:30": 0, "20:00": 8 });
});

test("five requests at once give the seats back once", async () => {
  const booking = await newBooking();
  const results = await Promise.all(Array.from({ length: 5 }, () => change(booking, "noShow", at("19:20"))));
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.deepEqual(await getSeats(booking.restaurantId, date), { "19:00": 0, "19:30": 0, "20:00": 0 });
});

test("a booking changed since it was read isn't touched", async () => {
  const booking = await newBooking();
  await bookings().updateOne({ _id: booking._id }, { $set: { updatedAt: new Date(booking.updatedAt.getTime() + 1000) } });
  assert.deepEqual(await change(booking, "noShow", at("19:20")), { error: "stale" });
  assert.equal((await reload(booking)).status, "confirmed");
  assert.deepEqual(await getSeats(booking.restaurantId, date), { "19:00": 4, "19:30": 4, "20:00": 4 });
});

test("cancelling keeps the reason and returns only what's still held", async () => {
  const booking = await newBooking();
  assert.deepEqual(await change(booking, "cancelled", at("18:00"), { reason: "Closed that day" }), { ok: true });
  const cancelled = await reload(booking);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.cancelReason, "Closed that day");
  assert.deepEqual(await getSeats(booking.restaurantId, date), { "19:00": 0, "19:30": 0, "20:00": 0 });

  const partly = await newBooking({ status: "seated", releasedSlots: ["20:00"] });
  // Only the two half hours it still holds were counted for this one
  await days().updateOne({ _id: `${partly.restaurantId}:${date}` }, { $inc: { "seats.20:00": -4 } });
  await cancelBooking({ _id: partly._id, status: "seated" });
  assert.deepEqual(await getSeats(partly.restaurantId, date), { "19:00": 0, "19:30": 0, "20:00": 0 });
});

test("cancelling leaves no reason behind when none was given", async () => {
  const booking = await newBooking();
  await change(booking, "cancelled", at("18:00"));
  assert.equal((await reload(booking)).cancelReason, undefined);
});

test("the validator keeps the reason short", async () => {
  const booking = await newBooking();
  await assert.rejects(bookings().updateOne({ _id: booking._id }, { $set: { cancelReason: "x".repeat(201) } }), (error) => error.code === 121);
});
