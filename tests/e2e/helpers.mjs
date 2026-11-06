import { randomBytes, scryptSync } from "node:crypto";
import { expect } from "@playwright/test";
import { MongoClient } from "mongodb";

const PASSWORD = randomBytes(18).toString("base64url");
export const RUN = Date.now().toString(36);

// The same format as lib/auth/password.js, which can't be imported outside Next
function hashPassword(password) {
  const salt = randomBytes(16);
  const N = 2 ** 17;
  const key = scryptSync(password.normalize("NFKC"), salt, 64, { N, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return ["scrypt", N, 8, 1, salt.toString("base64url"), key.toString("base64url")].join("$");
}

const text = (ar, en) => ({ ar, en });

// One journey's data: everything it creates is tagged here and removed by cleanUp, so a
// run leaves nothing behind.
export function journey(name) {
  const client = new MongoClient(process.env.MONGODB_URI);
  const db = client.db(process.env.MONGODB_DB || "sufra");
  const users = [];
  const restaurants = [];
  const slugs = [];
  const errors = [];

  return {
    db,
    errors,
    async user(tag, extra = {}) {
      const person = { email: `test_${name}_${tag}_${RUN}@sufra.test`, name: `${tag} ${name}`, passwordHash: hashPassword(PASSWORD), emailVerifiedAt: new Date(), createdAt: new Date(), ...extra };
      const { insertedId } = await db.collection("users").insertOne(person);
      users.push(insertedId);
      return { ...person, _id: insertedId };
    },
    slug(tag = "place") {
      const slug = `e2e-${name}-${tag}-${RUN}`;
      slugs.push(slug);
      return slug;
    },
    async restaurant(slug, ownerIds, extra = {}) {
      const label = text("مطعم تجربة", `Test place ${RUN}`);
      const { insertedId } = await db.collection("restaurants").insertOne({
        slug,
        name: label,
        tagline: label,
        cuisine: label,
        city: label,
        address: label,
        phone: "+966 13 555 0142",
        opens: "13:00",
        closes: "01:00",
        accent: "#2E7D5B",
        menu: [],
        ownerIds,
        createdAt: new Date(),
        status: "published",
        ...extra,
      });
      restaurants.push(insertedId);
      return insertedId;
    },
    // A fresh browser profile, signed in if a person is given
    async open(browser, person, options = {}) {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error" && !/favicon|401|404|Failed to load resource/.test(message.text())) errors.push(`console: ${message.text().slice(0, 240)}`);
      });
      if (person) {
        await page.goto("/sign-in");
        await signIn(page, person);
        await page.waitForURL(/\/(dashboard|explore|admin|account)$/, { timeout: 60_000 });
      }
      return page;
    },
    async cleanUp() {
      const created = await db.collection("restaurants").find({ slug: { $in: slugs } }, { projection: { _id: 1 } }).toArray();
      const ids = [...restaurants, ...created.map(({ _id }) => _id)];
      await db.collection("bookings").deleteMany({ restaurantId: { $in: ids } });
      await db.collection("bookingDays").deleteMany({ restaurantId: { $in: ids } });
      await db.collection("siteDrafts").deleteMany({ restaurantId: { $in: ids } });
      await db.collection("siteVersions").deleteMany({ restaurantId: { $in: ids } });
      await db.collection("restaurants").deleteMany({ _id: { $in: ids } });
      await db.collection("adminLog").deleteMany({ targetId: { $in: slugs } });
      await db.collection("sessions").deleteMany({ userId: { $in: users } });
      await db.collection("users").deleteMany({ _id: { $in: users } });
      await client.close();
    },
  };
}

export async function signIn(page, person) {
  await page.fill('input[name="email"]', person.email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('main button[type="submit"]');
}

// Something that becomes true a moment later, in the database or on the server
export const eventually = (check, message) => expect.poll(check, { message, timeout: 30_000 }).toBeTruthy();
