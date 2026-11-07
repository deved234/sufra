// An owner moving bookings through their day, with what that does to the seats
import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import { eventually, journey } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

const data = journey("status");
const SLUG = data.slug();
const bookings = () => data.db.collection("bookings");
const days = () => data.db.collection("bookingDays");
let restaurantId;
let customer;
let page;

// Riyadh is UTC+3 all year
const riyadhDay = (time) => new Date(time + 3 * 3600 * 1000).toISOString().slice(0, 10);
const HOUR = 3600 * 1000;
const today = riyadhDay(Date.now());
const tomorrow = riyadhDay(Date.now() + 24 * HOUR);

async function addBooking({ date, time, startsAt, name, ...extra }) {
  const slots = [time, `${time.slice(0, 3)}30`, `${String((Number(time.slice(0, 2)) + 1) % 24).padStart(2, "0")}:00`];
  const party = 4;
  await days().updateOne({ _id: `${restaurantId}:${date}` }, { $inc: Object.fromEntries(slots.map((slot) => [`seats.${slot}`, party])), $setOnInsert: { restaurantId, date, expiresAt: new Date(Date.now() + 96 * HOUR) } }, { upsert: true });
  const now = new Date();
  const { insertedId } = await bookings().insertOne({ restaurantId, userId: null, source: "owner", date, time, slots, startsAt, party, name, email: null, phone: "0512345678", status: "confirmed", code: new ObjectId().toString().slice(-6).toUpperCase(), locale: "ar", createdAt: now, updatedAt: now, ...extra });
  return { id: insertedId, date, slots };
}
const statusOf = async ({ id }) => (await bookings().findOne({ _id: id })).status;
const seats = async ({ date, slots }) => {
  const day = await days().findOne({ _id: `${restaurantId}:${date}` });
  return slots.map((slot) => day.seats[slot]);
};
const row = (name) => page.locator("main li").filter({ hasText: name }).filter({ visible: true });
const openDay = (date) => page.goto(`/dashboard/${SLUG}/bookings?date=${date}`);
const optionsOf = (name) => row(name).locator("select option").allTextContents();

test.beforeAll(async ({ browser }) => {
  const owner = await data.user("owner");
  customer = await data.user("customer");
  restaurantId = await data.restaurant(SLUG, [owner._id], { booking: { enabled: true, capacity: 10, durationMinutes: 90, maxParty: 4 } });
  page = await data.open(browser, owner);
});
test.afterAll(() => data.cleanUp());

test("a booking still to come offers neither no-show nor completed", async () => {
  await addBooking({ date: tomorrow, time: "19:00", startsAt: new Date(Date.now() + 26 * HOUR), name: "Coming" });
  await openDay(tomorrow);
  await expect(row("Coming")).toBeVisible();
  expect(await optionsOf("Coming")).toEqual(["مؤكد", "ملغي"]);
  await expect(row("Coming").getByRole("button", { name: "ما حضر" })).toHaveCount(0);
});

test("cancelling asks first, and backing out changes nothing", async () => {
  const booking = await addBooking({ date: tomorrow, time: "20:00", startsAt: new Date(Date.now() + 27 * HOUR), name: "Second thoughts" });
  await openDay(tomorrow);
  const select = row("Second thoughts").locator("select");
  await select.selectOption({ label: "ملغي" });
  await page.getByRole("button", { name: "لا، خلّه" }).click();
  await expect(page.getByRole("button", { name: "لا، خلّه" })).toHaveCount(0);
  await expect(select).toHaveValue("confirmed");
  expect(await statusOf(booking)).toBe("confirmed");

  // Taken by phone: there's nobody to give a reason to
  await select.selectOption({ label: "ملغي" });
  await expect(page.locator('textarea[name="cancelReason"]')).toHaveCount(0);
  await page.getByRole("button", { name: "ألغِ الحجز" }).click();
  await eventually(async () => (await statusOf(booking)) === "cancelled", "the booking is cancelled");
  // The first half hour is shared with the booking before it
  await eventually(async () => JSON.stringify(await seats(booking)) === "[4,0,0]", "its seats are free");
});

test("the customer sees why it was cancelled", async ({ browser }) => {
  const booking = await addBooking({ date: tomorrow, time: "21:00", startsAt: new Date(Date.now() + 28 * HOUR), name: "Online guest", source: "online", userId: customer._id, email: customer.email });
  await openDay(tomorrow);
  await row("Online guest").locator("select").selectOption({ label: "ملغي" });
  await page.fill('textarea[name="cancelReason"]', "المطعم مقفول للصيانة");
  await page.getByRole("button", { name: "ألغِ الحجز" }).click();
  await eventually(async () => (await statusOf(booking)) === "cancelled", "the booking is cancelled");
  await expect(row("Online guest").getByText("المطعم مقفول للصيانة")).toBeVisible();

  const theirs = await data.open(browser, customer);
  await theirs.goto(`/account/bookings/${booking.id}`);
  await expect(theirs.getByText("المطعم مقفول للصيانة")).toBeVisible();
  await theirs.context().close();
});

test("a no-show frees the table, and undoing it takes the table back", async () => {
  const booking = await addBooking({ date: today, time: "03:00", startsAt: new Date(Date.now() - HOUR / 6), name: "Late guest" });
  await openDay(today);
  await row("Late guest").getByRole("button", { name: "ما حضر" }).click();
  await eventually(async () => (await statusOf(booking)) === "noShow", "marked as a no-show");
  await eventually(async () => (await seats(booking)).every((taken) => taken === 0), "the seats are free");

  await openDay(today);
  await row("Late guest").locator("select").selectOption({ label: "مؤكد" });
  await eventually(async () => (await statusOf(booking)) === "confirmed", "back to confirmed");
  await eventually(async () => (await seats(booking)).every((taken) => taken === 4), "the seats are held again");
});

test("undoing with the table taken says so, and stays a no-show", async () => {
  const booking = await addBooking({ date: today, time: "05:00", startsAt: new Date(Date.now() - HOUR / 6), name: "Too late" });
  await openDay(today);
  await row("Too late").getByRole("button", { name: "ما حضر" }).click();
  await eventually(async () => (await statusOf(booking)) === "noShow", "marked as a no-show");
  await days().updateOne({ _id: `${restaurantId}:${today}` }, { $set: { "seats.05:30": 8 } });

  await openDay(today);
  await row("Too late").locator("select").selectOption({ label: "حضر" });
  await expect(page.getByText("ما عاد فيه كراسي كافية")).toBeVisible();
  expect(await statusOf(booking)).toBe("noShow");
  await expect(row("Too late").locator("select")).toHaveValue("noShow");
});

test("the owner can take a larger party by phone than customers can book", async () => {
  await openDay(tomorrow);
  await page.getByRole("button", { name: "أضف حجز" }).click();
  await page.fill('input[name="name"]', "Big family");
  await page.fill('input[name="phone"]', "0512345678");
  await page.fill('input[name="party"]', "6");
  const time = page.locator('select[name="time"]');
  await expect(time).toBeEnabled({ timeout: 15_000 });
  await time.selectOption({ index: 8 });
  await page.locator('dialog button[type="submit"]').click();
  await eventually(() => bookings().findOne({ restaurantId, name: "Big family", party: 6 }), "the booking is saved");
});

test("no errors in the browser", () => {
  expect(data.errors).toEqual([]);
});
