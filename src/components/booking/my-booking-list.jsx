import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/booking-slots";
import { formatTime } from "@/lib/opening-hours";
import StatusBadge from "@/components/booking/status-badge";

const openBy = (booking, by) => booking.proposal && !booking.proposal.expired && booking.proposal.by === by;

// A customer's upcoming bookings, soonest first, with those waiting for their answer
// at the top. The list comes newest first.
export function upcomingBookings(bookings, now = new Date().toISOString()) {
  const needsAnswer = (booking) => (openBy(booking, "owner") ? 0 : 1);
  return bookings
    .filter((booking) => booking.status === "confirmed" && booking.startsAt > now)
    .reverse()
    .sort((a, b) => needsAnswer(a) - needsAnswer(b));
}

// rebook: a link back to the restaurant's booking page on each item
export default async function MyBookingList({ title, bookings, rebook = false }) {
  const [t, locale] = await Promise.all([getTranslations("Bookings"), getLocale()]);
  if (bookings.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-h3 font-bold">{title}</h2>
      <ul className="flex flex-col gap-3">
        {bookings.map((booking) => (
          <li key={booking.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-shadow duration-150 hover:shadow-md">
            <Link href={`/dashboard/bookings/${booking.id}`} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate font-semibold">{booking.restaurantName[locale]}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(booking.date, locale)} · {formatTime(booking.time, locale)} · {t("guests", { count: booking.party })}
                </p>
              </div>
              {openBy(booking, "owner") ? (
                <span className="rounded-pill bg-brand px-3 py-1 text-xs font-semibold text-on-brand">{t("awaitingYou")}</span>
              ) : openBy(booking, "customer") ? (
                <span className="rounded-pill bg-brand-soft px-3 py-1 text-xs font-semibold text-on-brand-soft">{t("awaitingRestaurant")}</span>
              ) : (
                <StatusBadge status={booking.status} />
              )}
            </Link>
            {rebook && booking.restaurantPublic && (
              <Link href={`/r/${booking.slug}/book`} className="self-start text-sm font-semibold text-brand-text hover:underline">
                {t("bookAgain")}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
