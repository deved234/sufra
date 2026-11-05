import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/dal";
import { getDayBookings, getOwnedRestaurantDoc } from "@/lib/booking/data";
import { countUnseen, getWeekStrip, searchBookings } from "@/lib/booking/owner-data";
import { getSeats } from "@/lib/booking/seats";
import { daySlots, isValidDate, riyadhDate } from "@/lib/booking-slots";
import { getOwnedRestaurant } from "@/lib/dashboard/data";
import RestaurantNav from "@/components/dashboard/restaurant-nav";
import BookingsBoard from "@/components/dashboard/bookings-board";
import WeekStrip from "@/components/dashboard/week-strip";

const STATUSES = ["confirmed", "seated", "completed", "noShow", "cancelled"];

export async function generateMetadata() {
  const t = await getTranslations("Bookings");
  return { title: t("boardTitle") };
}

export default async function RestaurantBookings({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await requireUser(`/dashboard/${slug}/bookings`);
  const [restaurant, doc] = await Promise.all([getOwnedRestaurant(slug, user.id), getOwnedRestaurantDoc(slug, user.id)]);
  if (!restaurant || !doc) notFound();

  const today = riyadhDate();
  const date = typeof query.date === "string" && isValidDate(query.date) ? query.date : today;
  const status = STATUSES.includes(query.status) ? query.status : null;
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 60) : "";
  const { booking, opens, closes } = restaurant;

  const [bookings, seats, results, unseen, week, locale] = await Promise.all([
    getDayBookings(doc._id, date),
    getSeats(doc._id, date),
    search ? searchBookings(doc._id, search) : null,
    countUnseen(doc._id, doc.bookingsSeenAt),
    booking ? getWeekStrip(doc._id, booking.capacity, today) : null,
    getLocale(),
  ]);

  return (
    <>
      <RestaurantNav slug={slug} name={restaurant.name[locale]} current="bookings" />
      <BookingsBoard
        slug={slug}
        date={date}
        today={today}
        status={status}
        search={search}
        results={results}
        bookings={bookings}
        seats={seats}
        // The half hours the restaurant is open
        slots={daySlots(restaurant, 30)}
        restaurant={{ opens, closes, booking: booking ?? null }}
        seenAt={doc.bookingsSeenAt?.toISOString() ?? null}
        unseen={unseen}
        week={week && <WeekStrip slug={slug} days={week} current={date} />}
      />
    </>
  );
}
