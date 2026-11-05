import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/dal";
import { getDayBookings, getOwnedRestaurantId } from "@/lib/booking/data";
import { getSeats } from "@/lib/booking/seats";
import { daySlots, DEFAULT_BOOKING, isValidDate, riyadhDate } from "@/lib/booking-slots";
import { getOwnedRestaurant } from "@/lib/dashboard/data";
import RestaurantNav from "@/components/dashboard/restaurant-nav";
import BookingsBoard from "@/components/dashboard/bookings-board";

const STATUSES = ["confirmed", "seated", "completed", "noShow", "cancelled"];

export async function generateMetadata() {
  const t = await getTranslations("Bookings");
  return { title: t("boardTitle") };
}

export default async function RestaurantBookings({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await requireUser(`/dashboard/${slug}/bookings`);
  const [restaurant, restaurantId] = await Promise.all([getOwnedRestaurant(slug, user.id), getOwnedRestaurantId(slug, user.id)]);
  if (!restaurant || !restaurantId) notFound();

  const today = riyadhDate();
  const date = typeof query.date === "string" && isValidDate(query.date) ? query.date : today;
  const status = STATUSES.includes(query.status) ? query.status : null;
  const booking = restaurant.booking ?? DEFAULT_BOOKING;

  const [bookings, seats, locale] = await Promise.all([getDayBookings(restaurantId, date), getSeats(restaurantId, date), getLocale()]);

  return (
    <>
      <RestaurantNav slug={slug} name={restaurant.name[locale]} current="bookings" />
      <BookingsBoard
        slug={slug}
        date={date}
        today={today}
        status={status}
        bookings={bookings}
        seats={seats}
        // The half hours the restaurant is open, for the chart of the day
        slots={daySlots(restaurant, 30)}
        capacity={booking.capacity}
        enabled={booking.enabled}
      />
    </>
  );
}
