import { createHash, timingSafeEqual } from "node:crypto";

const digest = (text) => createHash("sha256").update(text).digest();

// Vercel sends CRON_SECRET as a bearer token. Without one set, nobody gets in. Comparing
// hashes keeps the lengths equal and the time taken the same, however close a guess is.
export function isVercelCron(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`));
}
