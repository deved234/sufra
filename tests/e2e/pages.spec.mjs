// The contact form, the legal pages, and what search engines and chat apps read.
import { expect, test } from "@playwright/test";
import { journey, RUN } from "./helpers.mjs";

const data = journey("pages");
const counters = () => data.db.collection("loginAttempts");
const clearCounters = () => counters().deleteMany({ _id: /^contact:/ });

test.beforeAll(clearCounters);
test.afterAll(async () => {
  await clearCounters();
  await data.cleanUp();
});

async function fillContact(page, { name = `Visitor ${RUN}`, email = `visitor_${RUN}@sufra.test`, message = "A question about booking a table" } = {}) {
  await page.goto("/en/contact");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Your email").fill(email);
  await page.getByLabel("Your message").fill(message);
}
const send = (page) => page.getByRole("button", { name: "Send" }).click();

test("a form with mistakes says so and keeps what was typed", async ({ browser }) => {
  const page = await data.open(browser);
  await fillContact(page, { email: "not-an-email", message: "short" });
  await send(page);
  await expect(page.getByLabel("Your email")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Your message")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Your name")).toHaveValue(`Visitor ${RUN}`);
  expect(await counters().countDocuments({ _id: /^contact:/ })).toBe(0);
});

test("a bot that fills in the hidden field gets a thank you and sends nothing", async ({ browser }) => {
  const page = await data.open(browser);
  await fillContact(page);
  await page.locator('input[name="leave_empty"]').evaluate((input) => (input.value = "https://spam.example"));
  await send(page);
  await expect(page.getByRole("status")).toContainText("We've got your message");
  expect(await counters().countDocuments({ _id: /^contact:/ })).toBe(0);
});

test("a message goes through, and a sixth in an hour is refused with its text kept", async ({ browser }) => {
  const page = await data.open(browser);
  for (let sent = 0; sent < 5; sent++) {
    await fillContact(page);
    await send(page);
    await expect(page.getByRole("status")).toContainText("We've got your message");
  }
  const message = "One message too many this hour";
  await fillContact(page, { message });
  await send(page);
  await expect(page.locator('main [role="alert"]')).toContainText("too many messages");
  await expect(page.getByLabel("Your message")).toHaveValue(message);
});

test("the footer leads to the contact and legal pages, in both languages", async ({ browser }) => {
  const page = await data.open(browser);
  for (const [home, heading] of [["/", "سياسة الخصوصية"], ["/en", "Privacy Policy"]]) {
    await page.goto(home);
    await page.locator('footer a[href$="/privacy"]').click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.locator('footer a[href$="/terms"]')).toBeVisible();
    await expect(page.locator('footer a[href$="/contact"]')).toBeVisible();
  }
});

test("signing up links to the terms and the privacy policy", async ({ browser }) => {
  const page = await data.open(browser);
  await page.goto("/sign-up");
  await expect(page.locator('main a[href="/terms"]')).toBeVisible();
  await expect(page.locator('main a[href="/privacy"]')).toBeVisible();
});

test("the sitemap lists public pages in both languages, and nothing private", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  const addresses = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  for (const path of ["/", "/en", "/contact", "/en/privacy", "/r/bait-alkabsa", "/en/r/bait-alkabsa"]) {
    expect(addresses).toContain(path);
  }
  expect(addresses.some((path) => /^\/r\/bait-alkabsa\/dish\//.test(path))).toBe(true);
  expect(addresses.filter((path) => /dashboard|admin|account|sign-|styleguide/.test(path))).toEqual([]);
  expect(xml).toContain('hreflang="x-default"');
});

test("robots keeps crawlers out of private pages and points at the sitemap", async ({ request }) => {
  const text = await (await request.get("/robots.txt")).text();
  expect(text).toContain("Disallow: /dashboard");
  expect(text).toContain("Disallow: /en/account");
  expect(text).toContain("/sitemap.xml");
  expect(text).not.toContain("/admin");
});

test("a shared link has a title and a real picture", async ({ browser, request }) => {
  const page = await data.open(browser);
  for (const path of ["/", "/en/contact", "/r/bait-alkabsa"]) {
    await page.goto(path);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /.+/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", /.+/);
    const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    const picture = await request.get(new URL(image).pathname);
    expect(picture.status()).toBe(200);
    expect(picture.headers()["content-type"]).toContain("image/");
  }
});

test("the new pages don't scroll sideways on a phone", async ({ browser }) => {
  const page = await data.open(browser, null, { viewport: { width: 375, height: 800 } });
  for (const path of ["/contact", "/privacy", "/terms", "/en/terms"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  }
});

test("no errors in the browser", () => {
  expect(data.errors).toEqual([]);
});
