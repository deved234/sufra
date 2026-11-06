// An admin stops a restaurant and restores it, and only an admin can
import { expect, test } from "@playwright/test";
import { eventually, journey } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

const data = journey("admin");
const SLUG = data.slug();
let owner;
let admin;
let page;

const stored = () => data.db.collection("restaurants").findOne({ slug: SLUG });
const statusOf = async (request) => (await request.get(`/r/${SLUG}`)).status();

test.beforeAll(async ({ browser }) => {
  owner = await data.user("owner");
  admin = await data.user("admin", { role: "admin" });
  await data.restaurant(SLUG, [owner._id]);
  page = await data.open(browser, admin);
});
test.afterAll(() => data.cleanUp());

test("the panel doesn't exist for an owner", async ({ browser }) => {
  const notAdmin = await data.open(browser, owner);
  await notAdmin.goto(`/admin/restaurants/${SLUG}`);
  await notAdmin.waitForLoadState("networkidle");
  await expect(notAdmin.getByRole("button", { name: "أوقف المطعم" })).toHaveCount(0);
  await notAdmin.context().close();
});

test("suspending needs a reason, and takes the site down", async ({ request }) => {
  await page.goto(`/admin/restaurants/${SLUG}`);
  await page.getByRole("button", { name: "أوقف المطعم" }).click();
  const confirm = page.locator('form:has(textarea[name="reason"]) button[type="submit"]');
  await confirm.click();
  await expect(page.locator("form").getByText("هذا الحقل مطلوب")).toBeVisible();
  await page.fill('textarea[name="reason"]', "محتوى مخالف");
  await confirm.click();
  await expect(page.getByText("سبب الإيقاف:")).toBeVisible();
  expect((await stored()).status).toBe("suspended");
  await eventually(async () => (await statusOf(request)) === 404, "the public page is gone");
});

test("it's written in the log", async () => {
  const entry = await data.db.collection("adminLog").findOne({ targetId: SLUG, actorEmail: admin.email });
  expect(entry).toBeTruthy();
  expect(entry.detail).toContain("محتوى مخالف");
});

test("the owner sees why, and has no button to undo it", async ({ browser }) => {
  const ownerPage = await data.open(browser, owner);
  await ownerPage.goto(`/dashboard/${SLUG}`);
  await expect(ownerPage.getByText("محتوى مخالف")).toBeVisible();
  await expect(ownerPage.getByRole("button", { name: /انشر المطعم|أظهر المطعم/ })).toHaveCount(0);
  await ownerPage.context().close();
});

test("restoring brings it back", async ({ request }) => {
  await page.getByRole("button", { name: "ارفع الإيقاف", exact: true }).click();
  await page.getByRole("button", { name: "تأكيد: ارفع الإيقاف" }).click();
  await eventually(async () => (await stored()).status === "published", "it's published again");
  await eventually(async () => (await statusOf(request)) === 200, "the public page is back");
});

test("no errors in the browser", () => {
  expect(data.errors).toEqual([]);
});
