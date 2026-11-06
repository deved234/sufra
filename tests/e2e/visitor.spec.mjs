// Someone looking for a restaurant, with no account. Reads the demo restaurants from db:seed.
import { expect, test } from "@playwright/test";
import { journey } from "./helpers.mjs";

const data = journey("visitor");
test.afterAll(() => data.cleanUp());

const RESTAURANT = 'main a[href="/r/bait-alkabsa"]';

test("the home page lists restaurants, in Arabic and right to left", async ({ browser }) => {
  const page = await data.open(browser);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(RESTAURANT).first()).toBeVisible();
});

test("search finds a restaurant whichever language it's typed in", async ({ browser }) => {
  const page = await data.open(browser);
  await page.goto("/explore");
  const search = page.locator('input[type="search"]');
  await search.fill("kabsa");
  await expect(page.locator(RESTAURANT).first()).toBeVisible();
  await search.fill("لا يوجد مطعم بهذا الاسم");
  await expect(page.locator(`${RESTAURANT} >> visible=true`)).toHaveCount(0);
});

test("a dish opens over the menu, and on its own page from a direct link", async ({ browser }) => {
  const page = await data.open(browser);
  await page.goto("/r/bait-alkabsa");
  // The cards fade in as they scroll into view, and until then they can't be clicked
  const dish = page.locator("[data-dish-card] a").first();
  await dish.evaluate((link) => link.scrollIntoView({ block: "center" }));
  await dish.click();
  await page.waitForURL(/\/dish\//);
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.reload();
  await expect(page.locator("main h1").first()).toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("the English page is left to right", async ({ browser }) => {
  const page = await data.open(browser);
  await page.goto("/en/r/bait-alkabsa");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("header").first()).toContainText("Bait Alkabsa");
});

test("a restaurant's page is in the HTML, and an unknown one is a real 404", async ({ request }) => {
  const found = await request.get("/r/bait-alkabsa");
  expect(found.status()).toBe(200);
  expect(await found.text()).toContain("بيت الكبسة");
  expect((await request.get("/r/no-such-restaurant")).status()).toBe(404);
});

test("a phone doesn't scroll sideways", async ({ browser }) => {
  const page = await data.open(browser, null, { viewport: { width: 375, height: 800 } });
  for (const path of ["/", "/explore", "/r/bait-alkabsa"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  }
});

test("no errors in the browser", () => {
  expect(data.errors).toEqual([]);
});
