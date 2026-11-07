// What a customer on a phone needs: booking in reach, a way to call, and why a day is closed
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import { journey } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

const data = journey("phone");
const SLUG = data.slug();
const SEEDED = "bait-alkabsa";
const PHONE = { viewport: { width: 375, height: 600 }, reducedMotion: "reduce" };
const HOUR = 3600 * 1000;
const riyadhDay = (time) => new Date(time + 3 * HOUR).toISOString().slice(0, 10);
const inTwoDays = riyadhDay(Date.now() + 48 * HOUR);
const inThreeDays = riyadhDay(Date.now() + 72 * HOUR);
let customer;
let restaurantId;
let page;

const bar = () => page.getByTestId("mobile-book-bar");
const axe = async () => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.map(({ id, nodes }) => `${id}: ${nodes[0].target.join(" ")}`);

test.beforeAll(async ({ browser }) => {
  const owner = await data.user("owner");
  customer = await data.user("customer");
  restaurantId = await data.restaurant(SLUG, [owner._id], {
    booking: { enabled: true, capacity: 10, durationMinutes: 90, maxParty: 8 },
    exceptions: [{ id: "works", from: inTwoDays, to: inThreeDays, type: "closed", note: "صيانة المطبخ" }],
  });
  page = await data.open(browser, null, PHONE);
});
test.afterAll(() => data.cleanUp());

test("the bar waits until the hero's button has scrolled away", async () => {
  await page.goto(`/r/${SEEDED}`);
  await expect(page.locator("[data-hero-book]")).toBeVisible();
  await expect(bar()).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect(bar()).toBeVisible();
  await expect(bar().getByRole("link", { name: "احجز طاولة" })).toHaveAttribute("href", new RegExp(`/r/${SEEDED}/book$`));
  await expect(bar().getByRole("link", { name: "اتصل" })).toHaveAttribute("href", /^tel:/);
  expect(await axe()).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar()).toBeHidden();
});

test("the footer stays readable above the bar", async () => {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(bar()).toBeVisible();
  const footer = await page.locator("footer").boundingBox();
  const covering = await bar().boundingBox();
  expect(footer.y + footer.height).toBeLessThanOrEqual(covering.y + 1);
});

test("a dish page has no hero button, so the bar comes after a screen of scrolling", async () => {
  await page.goto(`/r/${SEEDED}/dish/kabsa-lahm`);
  await expect(bar()).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 800));
  await expect(bar()).toBeVisible();
});

test("the booking page has no bar, and a larger party gets a number to call", async () => {
  await page.goto(`/r/${SLUG}/book`);
  await expect(page.locator('input[name="party"]').first()).toBeAttached();
  await expect(bar()).toHaveCount(0);
  await expect(page.locator('main a[href^="tel:"]')).toContainText("+966 13 555 0142");
  expect(await axe()).toEqual([]);
});

test("a closed day says so in its cell, and says why below", async () => {
  await page.goto(`/r/${SLUG}/book?party=2&step=date`);
  const closed = page.locator('label:has(input[name="date"]:disabled)');
  await expect(closed.first()).toContainText("مقفل");
  await expect(page.getByText("صيانة المطبخ")).toHaveCount(1);
  await expect(page.getByText("صيانة المطبخ")).toBeVisible();
  await expect(closed.first()).not.toHaveAttribute("title");
  expect(await axe()).toEqual([]);
});

test("sharing copies the link where the device has no share sheet", async ({ browser }) => {
  const context = await browser.newContext(PHONE);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined });
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text) => (window.copied = text) } });
  });
  const sharer = await context.newPage();
  await sharer.goto(`/r/${SEEDED}`);
  await sharer.getByRole("button", { name: "شارك" }).click();
  await expect(sharer.getByText("انتسخ الرابط")).toBeVisible();
  expect(await sharer.evaluate(() => window.copied)).toMatch(new RegExp(`/r/${SEEDED}$`));

  await sharer.goto(`/r/${SEEDED}/dish/kabsa-lahm`);
  await sharer.locator("main article").getByRole("button", { name: "شارك" }).click();
  await expect(sharer.getByText("انتسخ الرابط")).toBeVisible();
  expect(await sharer.evaluate(() => window.copied)).toMatch(/\/dish\/kabsa-lahm$/);
  await context.close();
});

test("a shared restaurant and dish show their own picture, at a full address", async ({ request }) => {
  for (const path of [`/r/${SEEDED}`, `/r/${SEEDED}/dish/kabsa-lahm`]) {
    const html = await (await request.get(path)).text();
    const [, image] = html.match(/<meta property="og:image" content="([^"]+)"/);
    expect(image).toMatch(/^https?:\/\//);
    expect(image).not.toMatch(/og\.png/);
  }
});

test("a booking's page says where to go and who to call", async ({ browser }) => {
  const now = new Date();
  const base = { restaurantId, userId: customer._id, source: "online", date: inThreeDays, time: "19:00", slots: ["19:00", "19:30", "20:00"], startsAt: new Date(Date.now() + 72 * HOUR), party: 2, name: customer.name, email: customer.email, phone: "0512345678", code: new ObjectId().toString().slice(-6).toUpperCase(), locale: "ar", createdAt: now, updatedAt: now };
  const { insertedId } = await data.db.collection("bookings").insertOne({ ...base, status: "confirmed" });
  const theirs = await data.open(browser, customer);
  await theirs.goto(`/account/bookings/${insertedId}`);
  await expect(theirs.getByRole("link", { name: "افتح في الخريطة" })).toHaveAttribute("href", /google\.com\/maps/);
  await expect(theirs.locator('main a[href^="tel:"]')).toContainText("+966 13 555 0142");

  await data.db.collection("bookings").updateOne({ _id: insertedId }, { $set: { status: "cancelled" } });
  await theirs.reload();
  await expect(theirs.getByRole("link", { name: "افتح في الخريطة" })).toHaveCount(0);
  await theirs.context().close();
});

test("no errors in the browser", () => {
  expect(data.errors).toEqual([]);
});
