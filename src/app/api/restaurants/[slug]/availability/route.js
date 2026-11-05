import { getDb } from "@/db/client";
import { RESTAURANTS } from "@/db/config";
import { getSeats } from "@/lib/booking/seats";
import { availableSlots, bookableDates } from "@/lib/booking-slots";
import { PUBLIC_RESTAURANT } from "@/lib/restaurants";
import { idSchema } from "@/lib/validation/menu";

// The booking page's time step. The page itself is static, and seats change by the
// minute, so this is read fresh on every request: ?date=2026-11-10
export async function GET(request, { params }) {
  const { slug } = await params;
  const date = request.nextUrl.searchParams.get("date");
  if (!idSchema.safeParse(slug).success || !bookableDates().includes(date)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const restaurant = await getDb()
    .collection(RESTAURANTS)
    .findOne({ slug, ...PUBLIC_RESTAURANT, "booking.enabled": true }, { projection: { opens: 1, closes: 1, weeklyHours: 1, exceptions: 1, booking: 1 } });
  if (!restaurant) return Response.json({ error: "closed" }, { status: 404 });

  const seats = await getSeats(restaurant._id, date);
  return Response.json({ slots: availableSlots({ ...restaurant, date, seats }), seats }, { headers: { "Cache-Control": "no-store" } });
}
