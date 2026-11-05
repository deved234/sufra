import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getMyBookings } from "@/lib/booking/data";
import { formatDate } from "@/lib/booking-slots";
import { formatTime } from "@/lib/opening-hours";
import StatusBadge from "@/components/booking/status-badge";

export async function generateMetadata() {
  const t = await getTranslations("Bookings");
  return { title: t("myTitle") };
}

// A customer's own bookings, at every restaurant
export default async function MyBookings() {
  const user = await requireUser("/dashboard/bookings");
  const [bookings, t] = await Promise.all([getMyBookings(user.id), getTranslations("Bookings")]);

  // An ISO date compares correctly as text. Soonest first for what's coming, and
  // the most recent first for what's gone.
  const now = new Date().toISOString();
  const isUpcoming = (booking) => booking.status === "confirmed" && booking.startsAt > now;
  const upcoming = bookings.filter(isUpcoming).reverse();
  const past = bookings.filter((booking) => !isUpcoming(booking));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-h2 font-extrabold">{t("myTitle")}</h1>
      {bookings.length === 0 ? (
        <section className="flex flex-col gap-2 rounded-lg border border-dashed border-border-strong bg-surface p-8">
          <h2 className="font-display text-h3 font-bold">{t("emptyTitle")}</h2>
          <p className="max-w-md text-muted-foreground">{t("emptyBody")}</p>
        </section>
      ) : (
        <>
          <BookingList title={t("upcoming")} bookings={upcoming} />
          <BookingList title={t("past")} bookings={past} />
        </>
      )}
    </div>
  );
}

async function BookingList({ title, bookings }) {
  const [t, locale] = await Promise.all([getTranslations("Bookings"), getLocale()]);
  if (bookings.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-h3 font-bold">{title}</h2>
      <ul className="flex flex-col gap-3">
        {bookings.map((booking) => (
          <li key={booking.id}>
            <Link href={`/dashboard/bookings/${booking.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 transition-shadow duration-150 hover:shadow-md">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate font-semibold">{booking.restaurantName[locale]}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(booking.date, locale)} · {formatTime(booking.time, locale)} · {t("guests", { count: booking.party })}
                </p>
              </div>
              <StatusBadge status={booking.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
