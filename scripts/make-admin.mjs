// Makes an existing account an admin, or takes that away. There is deliberately no way
// to do this from the site, so nobody can promote themselves through it.
// Run: npm run make-admin -- someone@example.com
//      npm run make-admin -- someone@example.com --remove
import { MongoClient } from "mongodb";
import { DB_NAME, USERS } from "../src/db/config.js";

const args = process.argv.slice(2);
const remove = args.includes("--remove");
const email = args.find((arg) => !arg.startsWith("--"))?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- email [--remove]");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI, { appName: "sufra-scripts" });
try {
  const update = remove ? { $unset: { role: "" } } : { $set: { role: "admin" } };
  const { matchedCount } = await client.db(DB_NAME).collection(USERS).updateOne({ email }, update);
  if (!matchedCount) {
    console.error(`No account with the email ${email}`);
    process.exitCode = 1;
  } else {
    console.log(remove ? `${email} is no longer an admin` : `${email} is now an admin`);
  }
} finally {
  await client.close();
}
