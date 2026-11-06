// Demo accounts against a real database: what one is made of, and that cleaning up can
// only ever remove what's temporary and over.
import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { after, test } from "node:test";
import { ObjectId } from "mongodb";
import { demoPhoto } from "@/data/dish-images";
import { getDb } from "@/db/client";
import { sendBookingConfirmed, sendPasswordReset } from "@/lib/auth/emails";
import { sendDueReminders } from "@/lib/booking/reminders";
import { removeExpiredDemos } from "@/lib/demo/cleanup";
import { DEMO_DOMAIN, isDemoEmail } from "@/lib/demo/constants";
import { createDemoAccount } from "@/lib/demo/create";
import { refuseLiveDatabase } from "./guard.mjs";

refuseLiveDatabase();

const db = () => getDb();
const DAY = 24 * 60 * 60 * 1000;
const made = { users: [], restaurants: [] };

async function newDemo(options = {}) {
  const account = await createDemoAccount({ locale: "en", ...options });
  const restaurant = await db().collection("restaurants").findOne({ slug: account.slug });
  made.users.push(account.userId);
  made.restaurants.push(restaurant._id);
  return { ...account, restaurant };
}

after(async () => {
  await db().collection("bookings").deleteMany({ restaurantId: { $in: made.restaurants } });
  await db().collection("bookingDays").deleteMany({ restaurantId: { $in: made.restaurants } });
  await db().collection("restaurants").deleteMany({ _id: { $in: made.restaurants } });
  await db().collection("users").deleteMany({ _id: { $in: made.users } });
  await globalThis.sufraMongo.close();
});

test("a demo gets its own hidden restaurant, full of sample data, and holds real seats", async () => {
  const { userId, restaurant } = await newDemo();
  const user = await db().collection("users").findOne({ _id: userId });
  assert.ok(isDemoEmail(user.email));
  assert.ok(user.email.endsWith(`.invalid`), "no mail can reach it");
  assert.equal(user.passwordHash, undefined, "nobody can sign in to it again");
  assert.ok(user.emailVerifiedAt);
  assert.equal(restaurant.status, "hidden");
  assert.deepEqual(restaurant.ownerIds, [userId]);
  assert.ok(restaurant.menu.flatMap((category) => category.items).length >= 5);

  const bookings = await db().collection("bookings").find({ restaurantId: restaurant._id }).toArray();
  assert.equal(bookings.length, 6);
  for (const booking of bookings) {
    assert.equal(booking.userId, null);
    assert.equal(booking.email, null);
    assert.ok(booking.demoExpiresAt);
  }
  const day = await db().collection("bookingDays").findOne({ _id: `${restaurant._id}:${bookings[0].date}` });
  assert.ok(Object.values(day.seats).some((taken) => taken > 0));
});

test("its dishes show the original restaurant's photos, and a plain copy wouldn't", async () => {
  const { restaurant } = await newDemo();
  const dish = restaurant.menu[0].items[0];
  assert.ok(demoPhoto(restaurant.photosFrom, dish.id), "has a photo");
  assert.equal(demoPhoto(restaurant.slug, dish.id), null);
});

test("two demos share nothing", async () => {
  const [a, b] = await Promise.all([newDemo(), newDemo()]);
  assert.notEqual(a.slug, b.slug);
  assert.notEqual(a.userId.toString(), b.userId.toString());
  assert.notEqual(a.restaurant._id.toString(), b.restaurant._id.toString());
});

test("past bookings start as done, coming ones as confirmed, whatever the time of day", async () => {
  for (const hour of ["05", "16", "23"]) {
    const now = new Date(`2026-11-10T${hour}:00:00Z`);
    const { restaurant } = await newDemo({ now });
    const bookings = await db().collection("bookings").find({ restaurantId: restaurant._id }).toArray();
    for (const booking of bookings) assert.equal(booking.status, booking.startsAt < now ? "completed" : "confirmed");
  }
});

test("no email is sent to a demo address, or even counted", async () => {
  const email = `nobody-${new ObjectId()}@${DEMO_DOMAIN}`;
  const printed = [];
  const { info } = console;
  console.info = (...args) => printed.push(args);
  try {
    const restaurant = { name: { ar: "س", en: "S" }, slug: "x" };
    await sendBookingConfirmed({ _id: new ObjectId(), email, locale: "en", name: "N", code: "C", date: "2026-11-10", time: "19:00", party: 2 }, restaurant);
    await sendPasswordReset({ _id: new ObjectId(), email }, "en");
  } finally {
    console.info = info;
  }
  assert.deepEqual(printed, []);
  assert.equal(await db().collection("loginAttempts").countDocuments({ _id: `mail:to:${email}` }), 0);
});

test("its sample bookings never earn a reminder", async () => {
  const { restaurant } = await newDemo();
  const sent = [];
  await sendDueReminders({ send: async (booking) => sent.push(booking._id.toString()) });
  const ids = (await db().collection("bookings").find({ restaurantId: restaurant._id }).toArray()).map(({ _id }) => _id.toString());
  assert.equal(sent.some((id) => ids.includes(id)), false);
});

test("cleaning up removes everything of an expired demo, and nothing else", async () => {
  const old = await newDemo({ now: new Date(Date.now() - 2 * DAY) });
  const fresh = await newDemo();
  const realUser = new ObjectId();
  const realRestaurant = new ObjectId();
  const label = { ar: "حقيقي", en: "Real" };
  await db().collection("users").insertOne({ _id: realUser, email: `real-${realUser}@sufra.test`, name: "Real", emailVerifiedAt: new Date(0), createdAt: new Date(0) });
  await db().collection("restaurants").insertOne({ _id: realRestaurant, slug: `e2e-real-${realUser}`, name: label, tagline: label, cuisine: label, city: label, address: label, phone: "+966 13 555 0142", opens: "13:00", closes: "01:00", accent: "#2E7D5B", menu: [], ownerIds: [realUser], createdAt: new Date(0), status: "published" });
  made.users.push(realUser);
  made.restaurants.push(realRestaurant);
  await db().collection("sessions").insertOne({ _id: randomBytes(32).toString("hex"), userId: old.userId, expiresAt: new Date(Date.now() + DAY), createdAt: new Date() });
  await db().collection("siteDrafts").insertOne({ restaurantId: old.restaurant._id, blocks: [], rev: 1, updatedAt: new Date() });

  const { restaurants, users } = await removeExpiredDemos();
  assert.ok(restaurants >= 1 && users >= 1);

  const count = (name, filter) => db().collection(name).countDocuments(filter);
  assert.equal(await count("users", { _id: old.userId }), 0);
  assert.equal(await count("restaurants", { _id: old.restaurant._id }), 0);
  assert.equal(await count("bookings", { restaurantId: old.restaurant._id }), 0);
  assert.equal(await count("bookingDays", { restaurantId: old.restaurant._id }), 0);
  assert.equal(await count("siteDrafts", { restaurantId: old.restaurant._id }), 0);
  assert.equal(await count("sessions", { userId: old.userId }), 0);

  assert.equal(await count("users", { _id: fresh.userId }), 1, "a demo with time left stays");
  assert.equal(await count("bookings", { restaurantId: fresh.restaurant._id }), 6);
  assert.equal(await count("users", { _id: realUser }), 1, "a real account stays");
  assert.equal(await count("restaurants", { _id: realRestaurant }), 1, "a real restaurant stays");
});
