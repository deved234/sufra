// A table, from the first click to cancelling it
import { expect, test } from "@playwright/test";
import { eventually, journey, signIn } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

const data = journey("booking");
const SLUG = data.slug();
let restaurantId;
let customer;
let stranger;
let page;
let booking;

test.beforeAll(async ({ browser }) => {
  const owner = await data.user("owner");
  customer = await data.user("customer");
  stranger = await data.user("stranger");
  restaurantId = await data.restaurant(SLUG, [owner._id], { booking: { enabled: true, capacity: 10, durationMinutes: 90, maxParty: 8 } });
  page = await data.open(browser);
});
test.afterAll(() => data.cleanUp());

const next = () => page.getByRole("button", { name: "التالي" }).click();
const seats = async () => (await data.db.collection("bookingDays").findOne({ _id: `${restaurantId}:${booking.date}` }))?.seats ?? {};

test("a visitor chooses everything without an account, and it's all kept in the address", async () => {
  await page.goto(`/r/${SLUG}`);
  await page.locator(`main a[href$="/r/${SLUG}/book"]`).first().click();
  await page.locator('label:has(input[name="party"])').nth(3).click();
  await expect(page).toHaveURL(/party=4/);
  await next();
  await page.locator('label:has(input[name="date"])').nth(1).click();
  await next();
  await page.locator('label:has(input[name="time"])').nth(12).click();
  await next();
  await expect(page.locator('main a[href*="/sign-in"]').first()).toBeVisible();
});

test("signing in comes back to the same step with every choice", async () => {
  await page.locator('main a[href*="/sign-in"]').first().click();
  await page.waitForURL("**/sign-in?**");
  await signIn(page, customer);
  await page.waitForURL(`**/r/${SLUG}/book?**`, { timeout: 60_000 });
  await expect(page.locator('input[name="phone"]')).toBeVisible();
  await expect(page).toHaveURL(/step=details/);
  await expect(page).toHaveURL(/party=4/);
});

test("a bad phone number is refused, and a good one books the table", async () => {
  await page.fill('input[name="phone"]', "abc");
  await page.click('main button[type="submit"]');
  await expect(page.getByText("اكتب رقم جوالك")).toBeVisible();
  await page.fill('input[name="phone"]', "0512345678");
  await page.click('main button[type="submit"]');
  await page.waitForURL("**/account/bookings/**", { timeout: 30_000 });
  booking = await data.db.collection("bookings").findOne({ restaurantId });
  expect(booking).toMatchObject({ party: 4, status: "confirmed", email: customer.email, source: "online" });
  expect(booking.slots).toHaveLength(3);
  const taken = await seats();
  for (const slot of booking.slots) expect(taken[slot]).toBe(4);
});

test("another account can't see it", async ({ browser }) => {
  const other = await data.open(browser, stranger);
  await other.goto(`/account/bookings/${booking._id}`);
  await other.waitForLoadState("networkidle");
  await expect(other.getByText(booking.code)).toHaveCount(0);
  await other.context().close();
});

test("cancelling gives the seats back", async () => {
  await page.goto(`/account/bookings/${booking._id}`);
  await page.getByRole("button", { name: "إلغاء الحجز" }).click();
  await page.getByRole("button", { name: "أيوه، ألغِ الحجز" }).click();
  await eventually(async () => (await data.db.collection("bookings").findOne({ _id: booking._id })).status === "cancelled", "the booking is cancelled");
  const taken = await seats();
  for (const slot of booking.slots) expect(taken[slot]).toBe(0);
});

test("no errors in the browser", () => {
  expect(data.errors).toEqual([]);
});
