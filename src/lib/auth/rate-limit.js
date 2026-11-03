import "server-only";
import { Int32 } from "mongodb";
import { getDb } from "@/db/client";
import { LOGIN_ATTEMPTS } from "@/db/config";

// Wrong passwords per email, forgotten by MongoDB (TTL index) after the window
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

const attempts = () => getDb().collection(LOGIN_ATTEMPTS);

export async function isLockedOut(email) {
  const doc = await attempts().findOne({ _id: email, expiresAt: { $gt: new Date() } });
  return (doc?.count ?? 0) >= MAX_FAILURES;
}

export async function recordFailure(email) {
  await attempts().updateOne(
    { _id: email },
    { $inc: { count: new Int32(1) }, $setOnInsert: { expiresAt: new Date(Date.now() + WINDOW_MS) } },
    { upsert: true },
  );
}

export async function clearFailures(email) {
  await attempts().deleteOne({ _id: email });
}
