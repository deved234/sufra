import { sendBookingReminder } from "@/lib/auth/emails";
import { sendDueReminders } from "@/lib/booking/reminders";
import { isVercelCron } from "@/lib/cron-auth";

// Runs once a day, from the schedule in vercel.json
export async function GET(request) {
  if (!isVercelCron(request)) return new Response("Unauthorized", { status: 401 });
  const result = await sendDueReminders({ send: sendBookingReminder });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
