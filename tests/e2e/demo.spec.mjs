// "Try without an account": a whole dashboard from one press, and what it may not do. Each
// refusal is pressed for real, since the pages don't hide the buttons: the server decides.
import { expect, test } from "@playwright/test";
import { journey } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

const data = journey("demo");
const REFUSED = "This isn't available on a demo account";
const PATH = "/api/cron/cleanup-demos";
const counters = () => data.db.collection("loginAttempts").deleteMany({ _id: /^demo:/ });

async function removeDemos() {
  await data.db.collection("restaurants").deleteMany({ demoExpiresAt: { $exists: true } });
  await data.db.collection("bookings").deleteMany({ demoExpiresAt: { $exists: true } });
  await data.db.collection("users").deleteMany({ demoExpiresAt: { $exists: true } });
}

let page;
let slug;

const press = (target) => target.getByRole("button", { name: "Try the dashboard, no account" }).first().click();
const alert = (target) => target.locator('main [role="alert"]').filter({ hasText: REFUSED }).first();

test.beforeAll(async ({ browser }) => {
  await counters();
  page = await data.open(browser);
});
test.afterAll(async () => {
  await removeDemos();
  await counters();
  await data.cleanUp();
});

test("one press opens a full dashboard, and says what it is", async () => {
  await page.goto("/en/for-restaurants");
  await press(page);
  await page.waitForURL(/\/en\/dashboard\/demo-[a-f0-9]+$/, { timeout: 60_000 });
  slug = page.url().split("/").pop();
  await expect(page.getByText("This is a demo account")).toBeVisible();
});

test("its bookings, menu and photos are all there", async () => {
  const restaurant = await data.db.collection("restaurants").findOne({ slug });
  const { date } = await data.db.collection("bookings").findOne({ restaurantId: restaurant._id });
  await page.goto(`/en/dashboard/${slug}/bookings?date=${date}`);
  await expect(page.getByText("Mohammed Alotaibi")).toBeVisible();
  await page.goto(`/en/dashboard/${slug}/menu`);
  await expect(page.getByText("Lamb kabsa").first()).toBeVisible();
  await expect(page.locator("main img").first()).toBeVisible();
});

test("it can open the page editor on its own restaurant", async () => {
  await page.goto(`/en/dashboard/${slug}/site`);
  await page.waitForSelector("aside ol", { state: "attached" });
  await expect(page.locator('[data-frame="menu"], [data-frame^="default-menu"]').first()).toBeVisible();
});

test("visitors can't reach it", async ({ request }) => {
  expect((await request.get(`/r/${slug}`)).status()).toBe(404);
  expect((await request.get(`/en/r/${slug}`)).status()).toBe(404);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(slug);
});

test("it can't show the restaurant to visitors", async () => {
  await page.goto(`/en/dashboard/${slug}/settings`);
  await page.getByRole("button", { name: "Show restaurant" }).click();
  await expect(alert(page)).toBeVisible();
  const { status } = await data.db.collection("restaurants").findOne({ slug });
  expect(status).toBe("hidden");
});

test("it can't delete the restaurant", async () => {
  await page.goto(`/en/dashboard/${slug}/settings`);
  await page.getByRole("button", { name: /delete/i }).first().click();
  await page.locator(`input[name="confirm"]`).fill(slug);
  await page.locator('form:has(input[name="confirm"]) button[type="submit"]').click();
  await expect(alert(page)).toBeVisible();
  expect((await data.db.collection("restaurants").findOne({ slug })).status).toBe("hidden");
});

test("it can't upload a photo", async () => {
  await page.goto(`/en/dashboard/${slug}/settings`);
  // The file input only answers once the page has come alive
  await page.waitForLoadState("networkidle");
  // A picture big enough to get past the checks in the browser, to where the server decides
  const picture = await page.evaluate(() => {
    const canvas = Object.assign(document.createElement("canvas"), { width: 1600, height: 900 });
    canvas.getContext("2d").fillRect(0, 0, 1600, 900);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('#photos input[type="file"]').first().setInputFiles({ name: "a.png", mimeType: "image/png", buffer: Buffer.from(picture, "base64") });
  await page.locator('dialog[open] [role="application"] img').waitFor();
  await page.locator("dialog[open] footer button, dialog[open] button").filter({ hasText: /^Use/ }).first().click();
  await expect(page.getByText(REFUSED).first()).toBeVisible({ timeout: 30_000 });
});

test("it can't open another restaurant", async () => {
  await page.goto("/en/dashboard/new");
  await page.fill('input[name="slug"]', "demo-should-not-exist");
  for (const name of ["nameAr", "nameEn", "taglineAr", "taglineEn", "cuisineAr", "cuisineEn", "cityAr", "cityEn", "addressAr", "addressEn"]) {
    const field = page.locator(`input[name="${name}"], textarea[name="${name}"]`);
    if (await field.count()) await field.first().fill("Test");
  }
  await page.locator('input[name="phone"]').fill("+966 11 234 5678");
  await page.locator('main form button[type="submit"]').first().click();
  await expect(page.locator(`main [role="alert"]`).first()).toBeVisible();
  expect(await data.db.collection("restaurants").countDocuments({ slug: "demo-should-not-exist" })).toBe(0);
});

test("it can't change its email or delete itself", async () => {
  await page.goto("/en/account/settings");
  const email = page.locator('form:has(input[name="email"])').first();
  const before = await data.db.collection("users").countDocuments({ demoExpiresAt: { $exists: true } });
  await email.locator('input[name="email"]').fill("someone@example.com");
  await email.locator('button[type="submit"]').click();
  await expect(alert(page)).toBeVisible();
  expect(await data.db.collection("users").countDocuments({ demoExpiresAt: { $exists: true } })).toBe(before);
  expect(await data.db.collection("emailTokens").countDocuments({ email: "someone@example.com" })).toBe(0);
});

test("it can't book a table at a real restaurant", async () => {
  const real = data.slug("real");
  const restaurantId = await data.restaurant(real, [], { booking: { enabled: true, capacity: 20, durationMinutes: 90, maxParty: 8 } });
  await page.goto(`/en/r/${real}/book`);
  const next = () => page.getByRole("button", { name: "Next" }).click();
  await page.locator('label:has(input[name="party"])').nth(1).click();
  await next();
  await page.locator('label:has(input[name="date"])').nth(1).click();
  await next();
  await page.locator('label:has(input[name="time"])').nth(4).click();
  await next();
  await page.fill('input[name="phone"]', "0512345678");
  await page.click('main button[type="submit"]');
  await expect(page.getByText(REFUSED).first()).toBeVisible();
  expect(await data.db.collection("bookings").countDocuments({ restaurantId })).toBe(0);
});

test("the admin panel doesn't list demos or count them", async ({ browser }) => {
  const admin = await data.user("admin", { role: "admin" });
  const panel = await data.open(browser, admin);
  for (const path of ["/en/admin", "/en/admin/restaurants", `/en/admin/restaurants?q=${slug}`, "/en/admin/users?q=demo.sufra", "/en/admin/bookings?q=Alotaibi"]) {
    await panel.goto(path);
    await panel.waitForLoadState("networkidle");
    const text = await panel.locator("main").innerText();
    expect(text, path).not.toContain(slug);
    expect(text, path).not.toContain("demo.sufra.invalid");
    expect(text, path).not.toContain("Alotaibi");
  }
  await panel.context().close();
});

test("pressing again while in a demo goes back to it, with no new account", async () => {
  const before = await data.db.collection("users").countDocuments({ demoExpiresAt: { $exists: true } });
  await page.goto("/en/for-restaurants");
  await press(page);
  await page.waitForURL(/\/en\/dashboard/);
  expect(await data.db.collection("users").countDocuments({ demoExpiresAt: { $exists: true } })).toBe(before);
});

test("someone signed in keeps their own account", async ({ browser }) => {
  const person = await data.user("real");
  const own = await data.open(browser, person);
  const before = await data.db.collection("users").countDocuments({ demoExpiresAt: { $exists: true } });
  await own.goto("/en/for-restaurants");
  await press(own);
  await own.waitForURL(/\/(dashboard|explore|account)/);
  expect(await data.db.collection("users").countDocuments({ demoExpiresAt: { $exists: true } })).toBe(before);
  await own.context().close();
});

test("one address can open only a few", async ({ browser }) => {
  await counters();
  for (let opened = 0; opened < 3; opened++) {
    const visitor = await data.open(browser);
    await visitor.goto("/en/for-restaurants/sign-in");
    await press(visitor);
    await visitor.waitForURL(/\/en\/dashboard\/demo-/, { timeout: 60_000 });
    await visitor.context().close();
  }
  const visitor = await data.open(browser);
  await visitor.goto("/en/for-restaurants");
  await press(visitor);
  await expect(visitor.getByText("You've opened several demo accounts").first()).toBeVisible();
  await visitor.context().close();
});

test("an expired demo is signed out at once, even before the cleanup runs", async () => {
  const past = { $set: { demoExpiresAt: new Date(Date.now() - 1000) } };
  await data.db.collection("users").updateMany({ demoExpiresAt: { $exists: true } }, past);
  await data.db.collection("restaurants").updateMany({ demoExpiresAt: { $exists: true } }, past);
  await page.goto(`/en/dashboard/${slug}`);
  await page.waitForURL(/sign-in/);
});

test("the cleanup job is closed to strangers and removes what's expired", async ({ request }) => {
  expect((await request.get(PATH)).status()).toBe(401);
  expect((await request.get(PATH, { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  const response = await request.get(PATH, { headers: { authorization: `Bearer ${process.env.E2E_CRON_SECRET}` } });
  expect(response.status()).toBe(200);
  expect(await data.db.collection("users").countDocuments({ demoExpiresAt: { $exists: true } })).toBe(0);
  expect(await data.db.collection("restaurants").countDocuments({ slug })).toBe(0);
});

test("no errors in the browser", () => {
  expect(data.errors).toEqual([]);
});
