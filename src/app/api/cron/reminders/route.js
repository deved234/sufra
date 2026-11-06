import { createHash, timingSafeEqual } from "node:crypto";
import { sendBookingReminder } from "@/lib/auth/emails";
import { sendDueReminders } from "@/lib/booking/reminders";

const digest = (text) => createHash("sha256").update(text).digest();

// Vercel sends CRON_SECRET as a bearer token. Without one set, nobody gets in. Comparing
// hashes keeps the lengths equal and the time taken the same, however close a guess is.
function isVercelCron(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`));
}

// Runs once a day, from the schedule in vercel.json
export async function GET(request) {
  if (!isVercelCron(request)) return new Response("Unauthorized", { status: 401 });
  const result = await sendDueReminders({ send: sendBookingReminder });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
