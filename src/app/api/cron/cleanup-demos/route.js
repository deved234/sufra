import { isVercelCron } from "@/lib/cron-auth";
import { removeExpiredDemos } from "@/lib/demo/cleanup";

// Runs once a day, from the schedule in vercel.json. An expired account can't sign in
// from the moment it expires, so a missed run only leaves its data a day longer.
export async function GET(request) {
  if (!isVercelCron(request)) return new Response("Unauthorized", { status: 401 });
  const result = await removeExpiredDemos();
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
