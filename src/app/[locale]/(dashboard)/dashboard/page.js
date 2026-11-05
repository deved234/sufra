import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { countMyPendingProposals, getMyBookings } from "@/lib/booking/data";
import { formatTime } from "@/lib/opening-hours";
import { getMyRestaurants } from "@/lib/dashboard/data";
import MyBookingList, { upcomingBookings } from "@/components/booking/my-booking-list";

const HOME_BOOKINGS = 3;

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("title") };
}

// One home for everyone: a customer sees their bookings, an owner also sees their
// restaurants, and someone with neither is pointed to both.
export default async function DashboardHome() {
  const user = await requireUser("/dashboard");
  const [restaurants, bookings, pending, t, menu, bookingsT, locale] = await Promise.all([
    getMyRestaurants(user.id),
    getMyBookings(user.id),
    countMyPendingProposals(user.id),
    getTranslations("Dashboard"),
    getTranslations("Menu"),
    getTranslations("Bookings"),
    getLocale(),
  ]);
  const upcoming = upcomingBookings(bookings);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-h2 font-extrabold">{t("hello", { name: user.name })}</h1>

      {user.role === "admin" && (
        <Link href="/admin" className="rounded-lg bg-brand-soft p-4 text-center font-semibold text-on-brand-soft sm:hidden">
          {t("adminPanel")}
        </Link>
      )}

      {pending > 0 && (
        <Link href="/dashboard/bookings" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-soft p-4 font-semibold text-on-brand-soft">
          {bookingsT("pendingNotice", { count: pending })}
          <span className="underline">{bookingsT("pendingOpen")}</span>
        </Link>
      )}

      {upcoming.length > 0 ? (
        <div className="flex flex-col gap-3">
          <MyBookingList title={bookingsT("upcoming")} bookings={upcoming.slice(0, HOME_BOOKINGS)} />
          {upcoming.length > HOME_BOOKINGS && (
            <Link href="/dashboard/bookings" className="self-start font-semibold text-brand-text hover:underline">
              {bookingsT("allMyBookings")}
            </Link>
          )}
        </div>
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border-strong bg-surface p-5">
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold">{bookingsT("emptyTitle")}</h2>
            <p className="text-sm text-muted-foreground">{bookingsT("emptyBody")}</p>
          </div>
          <Link href="/explore" className="rounded-pill bg-cta px-5 py-2.5 text-sm font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
            {bookingsT("browseRestaurants")}
          </Link>
        </section>
      )}

      {restaurants.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-h3 font-bold">{t("myRestaurants")}</h2>
            <Link href="/dashboard/new" className="rounded-pill border border-border-strong px-5 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-surface-muted">
              {t("newRestaurant")}
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {restaurants.map((restaurant) => (
              <li key={restaurant.slug}>
                <Link
                  href={`/dashboard/${restaurant.slug}`}
                  className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow duration-150 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="size-4 shrink-0 rounded-pill" style={{ backgroundColor: restaurant.accent }} />
                    <h3 className="truncate font-display text-h3 font-bold">{restaurant.name[locale]}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    /r/{restaurant.slug}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("categories", { count: restaurant.categoryCount })} · {menu("dishCount", { count: restaurant.dishCount })}
                  </p>
                  {restaurant.bookingEnabled && restaurant.summary && (
                    <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3 text-sm">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {bookingsT("cardToday", { count: restaurant.summary.todayCount, guests: restaurant.summary.todayGuests })}
                        {restaurant.summary.unseen > 0 && (
                          <span className="rounded-pill bg-danger px-2 py-0.5 text-xs font-bold text-background">{bookingsT("cardNew", { count: restaurant.summary.unseen })}</span>
                        )}
                      </p>
                      {restaurant.summary.upcoming[0] && (
                        <p className="text-muted-foreground">
                          {bookingsT("cardNext", { time: formatTime(restaurant.summary.upcoming[0].time, locale), name: restaurant.summary.upcoming[0].name, guests: restaurant.summary.upcoming[0].party })}
                        </p>
                      )}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("ownerPrompt")}{" "}
          <Link href="/dashboard/new" className="font-semibold text-brand-text hover:underline">
            {t("start")}
          </Link>
        </p>
      )}
    </div>
  );
}
