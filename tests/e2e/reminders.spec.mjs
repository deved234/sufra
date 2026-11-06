// The daily job's address: closed to everyone but Vercel, and doing its work for Vercel.
import { expect, test } from "@playwright/test";
import { journey, RUN } from "./helpers.mjs";

const data = journey("reminders");
test.afterAll(() => data.cleanUp());

const PATH = "/api/cron/reminders";
const bearer = (secret) => ({ headers: { authorization: `Bearer ${secret}` } });

test("without the secret, or with a wrong one, the job is refused and does nothing", async ({ request }) => {
  const restaurantId = await data.restaurant(data.slug("refused"), []);
  const customer = await data.user("refused");
  const id = await insertBooking(restaurantId, customer);

  expect((await request.get(PATH)).status()).toBe(401);
  expect((await request.get(PATH, bearer("wrong-secret"))).status()).toBe(401);
  expect((await request.get(PATH, { headers: { authorization: process.env.E2E_CRON_SECRET } })).status()).toBe(401);
  expect((await data.db.collection("bookings").findOne({ _id: id })).reminderSentAt).toBeUndefined();
});

test("with the secret, a due booking is reminded once", async ({ request }) => {
  const restaurantId = await data.restaurant(data.slug("due"), []);
  const customer = await data.user("due");
  const id = await insertBooking(restaurantId, customer);

  const first = await request.get(PATH, bearer(process.env.E2E_CRON_SECRET));
  expect(first.status()).toBe(200);
  expect((await first.json()).reminded).toBeGreaterThanOrEqual(1);
  const { reminderSentAt } = await data.db.collection("bookings").findOne({ _id: id });
  expect(reminderSentAt).toBeInstanceOf(Date);

  await request.get(PATH, bearer(process.env.E2E_CRON_SECRET));
  const after = await data.db.collection("bookings").findOne({ _id: id });
  expect(after.reminderSentAt.getTime()).toBe(reminderSentAt.getTime());
});

function insertBooking(restaurantId, customer) {
  const now = Date.now();
  return data.db
    .collection("bookings")
    .insertOne({
      restaurantId,
      userId: customer._id,
      source: "online",
      date: "2026-12-01",
      time: "19:00",
      slots: ["19:00"],
      startsAt: new Date(now + 10 * 60 * 60 * 1000),
      party: 2,
      name: customer.name,
      email: customer.email,
      phone: "0512345678",
      status: "confirmed",
      code: `R${RUN}${restaurantId}`,
      locale: "en",
      createdAt: new Date(now - 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 24 * 60 * 60 * 1000),
    })
    .then(({ insertedId }) => insertedId);
}
