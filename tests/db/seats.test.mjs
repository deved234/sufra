// Real concurrency against MongoDB. These can't be checked any other way: the point is
// what the database does when many requests arrive at once.
import { strict as assert } from "node:assert";
import { after, test } from "node:test";
import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { getSeats, moveSeatsWithinDay, releaseSeats, reserveSeats, undoMoveWithinDay } from "@/lib/booking/seats";
import { addDays, riyadhDate } from "@/lib/booking-slots";
import { refuseLiveDatabase } from "./guard.mjs";

refuseLiveDatabase();

const days = () => getDb().collection("bookingDays");
const madeDays = [];
function newDay(offset) {
  const restaurantId = new ObjectId();
  const date = addDays(riyadhDate(), offset);
  madeDays.push(`${restaurantId}:${date}`);
  return { restaurantId, date };
}

after(async () => {
  await days().deleteMany({ _id: { $in: madeDays } });
  await globalThis.sufraMongo.close();
});

const slots = ["19:00", "19:30", "20:00"];

test("20 bookings at once on a new day never go over capacity", async () => {
  const { restaurantId, date } = newDay(5);
  const results = await Promise.all(Array.from({ length: 20 }, () => reserveSeats({ restaurantId, date, slots, party: 2, capacity: 10 })));
  assert.equal(results.filter(Boolean).length, 5);
  assert.deepEqual(await getSeats(restaurantId, date), { "19:00": 10, "19:30": 10, "20:00": 10 });

  // An overlap on any one half hour is refused, leaving no partial counts
  assert.equal(await reserveSeats({ restaurantId, date, slots: ["20:00", "20:30"], party: 1, capacity: 10 }), false);
  assert.equal((await getSeats(restaurantId, date))["20:30"], undefined);

  // Released seats can be booked again
  await releaseSeats({ restaurantId, date, slots, party: 2 });
  assert.equal((await getSeats(restaurantId, date))["19:00"], 8);
  assert.equal(await reserveSeats({ restaurantId, date, slots, party: 2, capacity: 10 }), true);
});

test("the validator refuses a seat key that isn't a time", async () => {
  const { restaurantId, date } = newDay(7);
  await reserveSeats({ restaurantId, date, slots, party: 2, capacity: 10 });
  await assert.rejects(days().updateOne({ _id: `${restaurantId}:${date}` }, { $set: { "seats.bad": 1 } }), (error) => error.code === 121);
});

test("a full booking moves without competing with itself, and can't grow past capacity", async () => {
  const { restaurantId, date } = newDay(6);
  const base = { restaurantId, date, capacity: 4 };
  assert.equal(await reserveSeats({ restaurantId, date, slots, party: 4, capacity: 4 }), true);
  const moved = ["19:30", "20:00", "20:30"];
  assert.equal(await moveSeatsWithinDay({ ...base, fromSlots: slots, fromParty: 4, toSlots: moved, toParty: 4 }), true);
  assert.deepEqual(await getSeats(restaurantId, date), { "19:00": 0, "19:30": 4, "20:00": 4, "20:30": 4 });

  assert.equal(await moveSeatsWithinDay({ ...base, fromSlots: moved, fromParty: 4, toSlots: moved, toParty: 5 }), false);
  assert.equal((await getSeats(restaurantId, date))["19:30"], 4);

  const move = { fromSlots: moved, fromParty: 4, toSlots: ["21:00", "21:30", "22:00"], toParty: 2 };
  assert.equal(await moveSeatsWithinDay({ ...base, ...move }), true);
  await undoMoveWithinDay({ restaurantId, date, ...move });
  assert.deepEqual(await getSeats(restaurantId, date), { "19:00": 0, "19:30": 4, "20:00": 4, "20:30": 4, "21:00": 0, "21:30": 0, "22:00": 0 });
});

test("10 bookings racing into a time with room for 2: exactly 2 get it", async () => {
  const { restaurantId, date } = newDay(8);
  const races = Array.from({ length: 10 }, (_, i) => ({ fromSlots: [`0${i}:00`], fromParty: 2, toSlots: ["23:00"], toParty: 2 }));
  for (const { fromSlots } of races) await reserveSeats({ restaurantId, date, slots: fromSlots, party: 2, capacity: 4 });
  const results = await Promise.all(races.map((race) => moveSeatsWithinDay({ restaurantId, date, capacity: 4, ...race })));
  assert.equal(results.filter(Boolean).length, 2);
  assert.equal((await getSeats(restaurantId, date))["23:00"], 4);
});
