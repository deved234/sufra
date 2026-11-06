// The home page and the editor demo on /for-restaurants. No account and no writes.
import { expect, test } from "@playwright/test";
import { journey } from "./helpers.mjs";

const data = journey("landing");
test.afterAll(() => data.cleanUp());

const frames = (page) => page.locator("[data-frame]").evaluateAll((items) => items.map((item) => item.dataset.frame));

test("the home page's search leads to the results", async ({ browser }) => {
  const page = await data.open(browser);
  await page.goto("/en");
  await page.getByRole("search").getByRole("searchbox").fill("kabsa");
  await page.getByRole("search").getByRole("button").click();
  await page.waitForURL(/\/en\/explore\?q=kabsa/);
  // The page it came from can stay in the DOM, hidden
  await expect(page.locator('main input[type="search"] >> visible=true')).toHaveValue("kabsa");
  await expect(page.locator('main a[href="/en/r/bait-alkabsa"]').first()).toBeVisible();
});

test("the quick links come from real restaurants and filter by them", async ({ browser }) => {
  const page = await data.open(browser);
  await page.goto("/en");
  await page.locator('main a[href="/en/explore?city=Jeddah"]').click();
  await page.waitForURL(/city=Jeddah/);
  await expect(page.locator('main a[href="/en/r/bahr-jeddah"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/en/r/bait-alkabsa"] >> visible=true')).toHaveCount(0);
});

test("the home page shows real restaurants' photos, in the HTML", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain('href="/r/');
  expect(html).toContain('name="q"');
  expect(html).toContain("بيت الكبسة");
});

test("the demo's page is in the HTML, before any script runs", async ({ request }) => {
  const html = await (await request.get("/en/for-restaurants")).text();
  expect(html).toContain("Bait Alkabsa");
  expect(html).toContain('data-frame="menu-1"');
});

test.describe("the editor demo", () => {
  let page;
  const sent = [];

  test.beforeAll(async ({ browser }) => {
    page = await data.open(browser, null, { viewport: { width: 1400, height: 900 } });
    page.on("request", (request) => {
      if (request.method() !== "GET") sent.push(request.url());
    });
    await page.goto("/en/for-restaurants");
    await page.locator("#try").scrollIntoViewIfNeeded();
    // Interactive once a press on a block selects it
    await page.locator('[data-frame="hours-1"] > button').click();
    await expect(page.locator('[data-frame="hours-1"] > button')).toHaveAttribute("aria-pressed", "true");
  });

  test("moving a block moves it on the page, and undo brings it back", async () => {
    const before = await frames(page);
    await page.getByRole("button", { name: "Move Hours up" }).click();
    const after = await frames(page);
    expect(after.indexOf("hours-1")).toBe(before.indexOf("hours-1") - 1);
    await page.getByRole("button", { name: "Undo" }).click();
    expect(await frames(page)).toEqual(before);
  });

  test("a block's look changes what's drawn", async () => {
    await page.locator('[data-frame="menu-1"] > button').click();
    const menu = page.locator('[data-frame="menu-1"]');
    const grid = await menu.innerHTML();
    await page.getByRole("button", { name: "Compact", exact: true }).click();
    await expect(page.getByRole("button", { name: "Compact", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(await menu.innerHTML()).not.toBe(grid);
  });

  test("a block can be removed and added back, but not the menu", async () => {
    await page.getByRole("button", { name: "Remove Hours" }).click();
    expect(await frames(page)).not.toContain("hours-1");
    await expect(page.getByRole("button", { name: "Remove Menu" })).toBeDisabled();
    await page.getByRole("button", { name: "+ Hours" }).click();
    expect(await frames(page)).toContain("hours-1");
  });

  test("a template lays out the whole page, with the sample's content", async () => {
    await page.getByRole("button", { name: "Simple", exact: true }).click();
    expect(await frames(page)).toEqual(["hero-1", "menu-1", "hours-1", "contact-1"]);
    await page.getByRole("button", { name: "Showcase" }).or(page.getByRole("button", { name: /photos/i })).first().click();
    const shown = await frames(page);
    expect(shown).toContain("featured-1");
    expect(shown).not.toContain("gallery-1");
    await expect(page.locator('[data-frame="featured-1"]')).toContainText("Lamb kabsa");
    await expect(page.locator('[data-frame="about-1"]')).toContainText("grandma");
  });

  test("color, mode and size change only the preview", async () => {
    const preview = page.locator("[data-preview-page]");
    const restaurant = preview.locator("[data-restaurant]");
    const coral = await restaurant.getAttribute("style");
    await page.getByRole("button", { name: "Blue", exact: true }).click();
    expect(await restaurant.getAttribute("style")).not.toBe(coral);

    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(preview).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "Phone", exact: true }).click();
    expect((await preview.boundingBox()).width).toBeLessThanOrEqual(390);
  });

  test("starting over restores the first page", async () => {
    await page.getByRole("button", { name: "Start over" }).click();
    expect(await frames(page)).toEqual(["hero-1", "featured-1", "menu-1", "hours-1", "booking-1"]);
  });

  test("nothing was sent to the server", () => {
    expect(sent).toEqual([]);
  });
});

test("a phone or tablet doesn't scroll sideways, in either language", async ({ browser }) => {
  for (const width of [375, 820, 1024]) {
    const page = await data.open(browser, null, { viewport: { width, height: 800 } });
    for (const path of ["/", "/en", "/for-restaurants", "/en/for-restaurants"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${path} at ${width}`).toBeLessThanOrEqual(0);
    }
  }
});

test("all three hero photos show on a phone", async ({ browser }) => {
  const page = await data.open(browser, null, { viewport: { width: 375, height: 800 } });
  await page.goto("/");
  const tiles = page.locator("main section").first().locator("ul li a");
  await expect(tiles).toHaveCount(3);
  for (const tile of await tiles.all()) expect((await tile.boundingBox()).height).toBeGreaterThan(80);
});

test("with reduced motion, everything below the first screen is simply there", async ({ browser }) => {
  const page = await data.open(browser, null, { reducedMotion: "reduce" });
  await page.goto("/en");
  for (const item of await page.locator("[data-reveal]").all()) await expect(item).toHaveCSS("opacity", "1");
});

test("no errors in the browser", () => {
  expect(data.errors).toEqual([]);
});
