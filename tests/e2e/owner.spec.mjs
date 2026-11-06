// An owner from nothing to a published page of their own
import { expect, test } from "@playwright/test";
import { eventually, journey } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

const data = journey("owner");
const SLUG = data.slug();
let owner;
let page;

const publicPage = async (request) => (await request.get(`/r/${SLUG}`)).text();
const stored = () => data.db.collection("restaurants").findOne({ slug: SLUG });

test.beforeAll(async ({ browser }) => {
  owner = await data.user("owner");
  page = await data.open(browser, owner, { viewport: { width: 1400, height: 900 } });
});
test.afterAll(() => data.cleanUp());

test("creating a restaurant starts it as a private draft", async ({ request }) => {
  await page.goto("/dashboard/new");
  const fields = {
    "name.ar": "مطعمي",
    "name.en": "My place",
    slug: SLUG,
    "tagline.ar": "وصف",
    "tagline.en": "Tagline",
    "cuisine.ar": "مشويات",
    "cuisine.en": "Grills",
    "city.ar": "جدة",
    "city.en": "Jeddah",
    "address.ar": "شارع",
    "address.en": "Street",
    phone: "+966 13 555 0142",
  };
  for (const [name, value] of Object.entries(fields)) await page.fill(`main:visible input[name="${name}"]`, value);
  await page.click('main:visible form button[type="submit"]');
  await page.waitForURL(`**/dashboard/${SLUG}`, { timeout: 30_000 });
  expect((await stored()).status).toBe("draft");
  expect((await request.get(`/r/${SLUG}`)).status()).toBe(404);
});

test("a restaurant can't be published with no dishes", async () => {
  await page.getByRole("button", { name: "انشر المطعم" }).click();
  await expect(page.getByText("أضف طبق واحد على الأقل قبل النشر")).toBeVisible();
});

test("the menu takes a category and a dish", async () => {
  await page.goto(`/dashboard/${SLUG}/menu`);
  await page.getByRole("button", { name: "أضف قسم" }).click();
  await page.fill('dialog[open] input[name="name.ar"]', "المشاوي");
  await page.fill('dialog[open] input[name="name.en"]', "Grills");
  await page.click('dialog[open] form button[type="submit"]');
  await expect(page.locator("dialog[open]")).toHaveCount(0);

  await page.locator('button[id^="add-dish-"]').click();
  await page.fill('dialog[open] input[name="name.ar"]', "شيش طاووق");
  await page.fill('dialog[open] input[name="name.en"]', "Shish tawook");
  await page.fill('dialog[open] textarea[name="description.ar"]', "دجاج على الفحم");
  await page.fill('dialog[open] textarea[name="description.en"]', "Chicken over charcoal");
  await page.fill('dialog[open] input[name="price"]', "32");
  await page.click('dialog[open] form button[type="submit"]');
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await eventually(async () => (await stored()).menu[0]?.items[0]?.name.en === "Shish tawook", "the dish is saved");
});

test("publishing the restaurant opens it to visitors", async ({ request }) => {
  await page.goto(`/dashboard/${SLUG}`);
  await page.getByRole("button", { name: "انشر المطعم" }).click();
  await eventually(async () => (await stored()).status === "published", "it's published");
  await eventually(async () => (await publicPage(request)).includes("شيش طاووق"), "visitors see the dish");
});

test("edits in the site editor stay away from visitors until published", async ({ request }) => {
  await page.goto(`/dashboard/${SLUG}/site`);
  const publish = page.locator("header").getByRole("button", { name: "انشر" });
  await expect(publish).toBeDisabled();

  await page.getByRole("button", { name: "+ عننا" }).click();
  await page.locator('aside input[lang="ar"]').first().fill("قصة مطعمنا");
  await page.locator('aside input[lang="en"]').first().fill("Our story");
  await page.locator('aside textarea[lang="ar"]').fill("بدأنا من الفحم");
  await expect(page.locator("[data-preview-page]")).toContainText("قصة مطعمنا");

  // Publishing with the English text empty names what's missing
  await publish.click();
  await expect(page.locator("dialog[open]")).toContainText("عننا: النص");
  await page.locator("dialog[open] li button").first().click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.locator('aside textarea[lang="en"]').fill("We started with charcoal");

  await eventually(async () => (await data.db.collection("siteDrafts").findOne({ restaurantId: (await stored())._id }))?.blocks.some((block) => block.props.body?.en), "the draft is saved");
  expect(await publicPage(request)).not.toContain("قصة مطعمنا");

  await publish.click();
  await expect(page.getByText("انتشرت الصفحة")).toBeVisible();
  await eventually(async () => (await publicPage(request)).includes("قصة مطعمنا"), "visitors see it now");
  expect((await stored()).site.version).toBe(1);
});

test("a template rearranges the page, and undo goes back to what's published", async () => {
  const names = () => page.locator("aside ol button[aria-pressed]").allInnerTexts();
  await page.getByRole("button", { name: /^بسيط/ }).click();
  expect(await names()).toEqual(["الواجهة", "المنيو", "المواعيد", "التواصل"]);
  await page.keyboard.press("Control+z");
  expect(await names()).toContain("عننا");
  await expect(page.locator("header").getByRole("button", { name: "انشر" })).toBeDisabled();
});

test("another owner can't open the editor", async ({ browser }) => {
  const rival = await data.open(browser, await data.user("rival"));
  await rival.goto(`/dashboard/${SLUG}/site`);
  await expect(rival.getByText(/موجود/).first()).toBeVisible();
  await expect(rival.locator("aside ol")).toHaveCount(0);
  await rival.context().close();
});

test("no errors in the browser", () => {
  expect(data.errors).toEqual([]);
});
