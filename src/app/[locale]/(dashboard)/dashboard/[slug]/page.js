import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getOwnedRestaurantDoc } from "@/lib/booking/data";
import { getBookingSummary, getWeekStrip } from "@/lib/booking/owner-data";
import { formatDate } from "@/lib/booking-slots";
import { getOwnedRestaurant } from "@/lib/dashboard/data";
import { formatTime } from "@/lib/opening-hours";
import RestaurantNav from "@/components/dashboard/restaurant-nav";
import WeekStrip from "@/components/dashboard/week-strip";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("overview") };
}

export default async function RestaurantOverview({ params }) {
  const { slug } = await params;
  const user = await requireUser(`/dashboard/${slug}`);
  const [restaurant, doc] = await Promise.all([getOwnedRestaurant(slug, user.id), getOwnedRestaurantDoc(slug, user.id)]);
  if (!restaurant || !doc) notFound();

  const [t, bookings, locale] = await Promise.all([getTranslations("Dashboard"), getTranslations("Bookings"), getLocale()]);
  const bookingOn = Boolean(restaurant.booking?.enabled);
  const [summary, week] = bookingOn ? await Promise.all([getBookingSummary(doc), getWeekStrip(doc._id, restaurant.booking.capacity)]) : [null, null];

  return (
    <>
      <RestaurantNav slug={slug} name={restaurant.name[locale]} current="overview" />
      <div className="flex flex-col gap-8">
        {restaurant.dishCount === 0 && <SetupSteps slug={slug} bookingOn={bookingOn} />}

        {bookingOn ? (
          <>
            <section aria-label={bookings("todayTitle")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label={bookings("todayBookings")} value={summary.todayCount} />
              <Stat label={bookings("todayGuests")} value={summary.todayGuests} />
              <Stat label={bookings("seatsTakenNow")} value={summary.seatsNow?.taken ?? "–"} />
              <Stat label={bookings("seatsLeftNow")} value={summary.seatsNow?.left ?? "–"} hint={summary.seatsNow ? bookings("ofCapacity", { capacity: restaurant.booking.capacity }) : bookings("closedNow")} />
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-h3 font-bold">{bookings("nextTitle")}</h2>
                <Link href={`/dashboard/${slug}/bookings`} className="font-semibold text-brand-text hover:underline">
                  {bookings("allBookings")}
                </Link>
              </div>
              {summary.upcoming.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border-strong p-6 text-center text-muted-foreground">{bookings("noUpcoming")}</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
                  {summary.upcoming.map((booking) => (
                    <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {booking.name} <span className="font-normal text-muted-foreground">· {bookings("guests", { count: booking.party })}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(booking.date, locale, { weekday: "short", day: "numeric", month: "short" })} · {formatTime(booking.time, locale)}
                        </p>
                      </div>
                      {booking.phone && (
                        <a href={`tel:${booking.phone.replaceAll(" ", "")}`} className="rounded-pill border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-muted">
                          {bookings("call")}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-display text-h3 font-bold">{bookings("weekTitle")}</h2>
              <WeekStrip slug={slug} days={week} />
            </section>
          </>
        ) : (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border-strong bg-surface p-5">
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold">{bookings("offTitle")}</h2>
              <p className="max-w-lg text-sm text-muted-foreground">{bookings("offBody")}</p>
            </div>
            <Link href={`/dashboard/${slug}/settings#booking`} className="rounded-pill border border-border-strong px-5 py-2.5 text-sm font-semibold hover:bg-surface-muted">
              {bookings("turnOn")}
            </Link>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href={`/dashboard/${slug}/menu`} className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
            {t("editMenu")}
          </Link>
          <span className="flex items-center gap-2 rounded-pill border border-border px-4 py-2 text-sm text-muted-foreground">
            {t("categories", { count: restaurant.categoryCount })}
          </span>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-display text-h2 font-extrabold">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

// For a new restaurant, until it has something to show. Booking is there, marked
// optional, and isn't needed to finish.
async function SetupSteps({ slug, bookingOn }) {
  const t = await getTranslations("Bookings");
  const steps = [
    { key: "stepDetails", done: true, href: `/dashboard/${slug}/settings` },
    { key: "stepDish", done: false, href: `/dashboard/${slug}/menu` },
    { key: "stepBooking", done: bookingOn, href: `/dashboard/${slug}/settings#booking`, optional: true },
    { key: "stepView", done: false, href: `/r/${slug}` },
  ];
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface-tint p-5">
      <h2 className="font-display text-h3 font-bold">{t("setupTitle")}</h2>
      <ol className="flex flex-col gap-2">
        {steps.map(({ key, done, href, optional }, index) => (
          <li key={key} className="flex items-center gap-3">
            <span aria-hidden className={`flex size-7 shrink-0 items-center justify-center rounded-pill text-sm font-bold ${done ? "bg-success-soft text-success" : "bg-surface"}`}>
              {done ? "✓" : index + 1}
            </span>
            <Link href={href} className={`font-medium hover:underline ${done ? "text-muted-foreground" : ""}`}>
              {t(key)}
            </Link>
            {done && <span className="sr-only">{t("stepDone")}</span>}
            {optional && <span className="rounded-pill bg-surface px-2 py-0.5 text-xs text-muted-foreground">{t("optional")}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
