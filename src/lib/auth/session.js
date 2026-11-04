import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getDb } from "@/db/client";
import { SESSIONS } from "@/db/config";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/constants";
import { hashToken, newToken } from "@/lib/auth/token";

// Database sessions: the cookie holds a random token, the database holds its hash.
// Unlike a signed JWT, a session can be ended for real (sign out deletes it).

const DAY_MS = 24 * 60 * 60 * 1000;
const newExpiry = () => new Date(Date.now() + SESSION_DAYS * DAY_MS);

async function setCookie(token, expires) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // not readable from JavaScript, so an XSS bug can't steal it
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // not sent on cross-site form posts
    path: "/",
    expires,
  });
}

// Called from Server Actions only: rendering can't set cookies
export async function createSession(userId) {
  const token = newToken();
  const expiresAt = newExpiry();
  await getDb().collection(SESSIONS).insertOne({ _id: hashToken(token), userId, expiresAt, createdAt: new Date() });
  await setCookie(token, expiresAt);
}

// Someone saving in the dashboard stays signed in: once less than half of the
// session is left, it moves forward another full period. Server Actions only.
export async function extendSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return;
  const halfLeft = new Date(Date.now() + (SESSION_DAYS / 2) * DAY_MS);
  const expiresAt = newExpiry();
  const { modifiedCount } = await getDb()
    .collection(SESSIONS)
    .updateOne({ _id: hashToken(token), expiresAt: { $gt: new Date(), $lt: halfLeft } }, { $set: { expiresAt } });
  if (modifiedCount) await setCookie(token, expiresAt);
}

// The user id behind the current cookie, or null
export async function getSessionUserId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // Comparing with the current time: Next.js may prerender ahead of time with the
  // cookies (partial prefetching) but without a clock, so wait for a real request
  await connection();
  // expiresAt is checked here too: the TTL cleanup runs only about once a minute
  const session = await getDb()
    .collection(SESSIONS)
    .findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } });
  return session?.userId ?? null;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await getDb().collection(SESSIONS).deleteOne({ _id: hashToken(token) });
  cookieStore.delete(SESSION_COOKIE);
}

// Signs the user out everywhere, e.g. after a password reset
export async function deleteUserSessions(userId) {
  await getDb().collection(SESSIONS).deleteMany({ userId });
}
