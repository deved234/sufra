import "server-only";
import { headers } from "next/headers";
import { Int32 } from "mongodb";
import { getDb } from "@/db/client";
import { LOGIN_ATTEMPTS } from "@/db/config";

// Counters in MongoDB, each forgotten by a TTL index once its window ends.
// Keys look like "signin:email-ip:a@b.com|1.2.3.4" or "signup:ip:1.2.3.4".
const counters = () => getDb().collection(LOGIN_ATTEMPTS);

export const LIMITS = {
  // Wrong passwords for one email from one address: the usual brute-force guard.
  // Keyed with the IP so a stranger elsewhere can't lock the owner out.
  signInPair: { max: 5, windowMs: 15 * 60 * 1000 },
  // Wrong passwords for one email from anywhere: a high ceiling for attacks spread over many IPs
  signInEmail: { max: 30, windowMs: 15 * 60 * 1000 },
  // Wrong passwords from one address across emails ("password spraying")
  signInIp: { max: 30, windowMs: 15 * 60 * 1000 },
  // New accounts from one address
  signUpIp: { max: 5, windowMs: 60 * 60 * 1000 },
  // "Send the confirmation link again", per account
  verifyResend: { max: 3, windowMs: 15 * 60 * 1000 },
  // Password reset requests, per email and per address
  resetEmail: { max: 3, windowMs: 15 * 60 * 1000 },
  resetIp: { max: 10, windowMs: 15 * 60 * 1000 },
  // New bookings per customer: enough for a real person, a cap on holding every table
  bookingUser: { max: 10, windowMs: 60 * 60 * 1000 },
  // Every email to one inbox, whatever triggered it, so the site can't be used
  // to flood someone's inbox
  mailTo: { max: 5, windowMs: 60 * 60 * 1000 },
};

// The visitor address as Vercel reports it (it sets this header itself)
export async function clientIp() {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || "local";
}

export async function isLimited(key, { max }) {
  const doc = await counters().findOne({ _id: key, expiresAt: { $gt: new Date() } });
  return (doc?.count ?? 0) >= max;
}

export async function hit(key, { windowMs }) {
  await counters().updateOne(
    { _id: key },
    { $inc: { count: new Int32(1) }, $setOnInsert: { expiresAt: new Date(Date.now() + windowMs) } },
    { upsert: true },
  );
}

export async function clear(key) {
  await counters().deleteOne({ _id: key });
}
