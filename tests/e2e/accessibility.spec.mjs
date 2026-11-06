// What a machine can check against WCAG A and AA, on the pages anyone can reach, in both
// languages and color modes. It finds missing labels and low contrast, and can't judge
// whether the site is pleasant with a screen reader.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { journey } from "./helpers.mjs";

const data = journey("accessibility");
test.afterAll(() => data.cleanUp());

const PAGES = ["/", "/explore", "/for-restaurants", "/r/bait-alkabsa", "/r/bait-alkabsa/dish/kabsa-lahm", "/r/bait-alkabsa/book", "/contact", "/privacy", "/terms", "/sign-in", "/sign-up", "/for-restaurants/sign-up", "/forgot-password"];

const summary = (violations) =>
  violations.flatMap(({ id, help, nodes }) => nodes.slice(0, 4).map((node) => `${id}: ${help}\n  ${node.target.join(" ")}\n  ${node.failureSummary?.split("\n")[1]?.trim() ?? ""}`));

async function check(page, path) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(summary(violations), path).toEqual([]);
}

for (const [language, prefix] of [["Arabic", ""], ["English", "/en"]]) {
  for (const colorScheme of ["light", "dark"]) {
    test(`${language}, ${colorScheme} mode`, async ({ browser }) => {
      // Reduced motion: nothing is halfway through fading in while colors are measured
      const page = await data.open(browser, null, { colorScheme, reducedMotion: "reduce" });
      for (const path of PAGES) await check(page, `${prefix}${path}`.replace(/(.)\/$/, "$1"));
    });
  }
}

test("a phone, where the menu and layouts differ", async ({ browser }) => {
  const page = await data.open(browser, null, { viewport: { width: 375, height: 800 }, reducedMotion: "reduce" });
  for (const path of ["/", "/for-restaurants", "/r/bait-alkabsa"]) await check(page, path);
});
