import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { countMyPendingProposals } from "@/lib/booking/data";
import { formatTime } from "@/lib/opening-hours";
import { getMyRestaurants } from "@/lib/dashboard/data";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("title") };
}

// An owner's restaurants. An account with none has nothing here yet: it goes to
// create one, and an admin who owns nothing goes to the panel.
export default async function DashboardHome() {
  const user = await requireUser("/dashboard");
  const [restaurants, pending, t, menu, bookingsT, locale] = await Promise.all([
    getMyRestaurants(user.id),
    countMyPendingProposals(user.id),
    getTranslations("Dashboard"),
    getTranslations("Menu"),
    getTranslations("Bookings"),
    getLocale(),
  ]);
  if (restaurants.length === 0) redirect({ href: user.role === "admin" ? "/admin" : "/dashboard/new", locale });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-h2 font-extrabold">{t("hello", { name: user.name })}</h1>
          <p className="text-muted-foreground">{t("myRestaurants")}</p>
        </div>
        <Link href="/dashboard/new" className="rounded-pill border border-border-strong px-5 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-surface-muted">
          {t("newRestaurant")}
        </Link>
      </div>

      {/* An owner can be a customer elsewhere, and this one is waiting for their answer */}
      {pending > 0 && (
        <Link href="/account/bookings" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-soft p-4 font-semibold text-on-brand-soft">
          {bookingsT("pendingNotice", { count: pending })}
          <span className="underline">{bookingsT("pendingOpen")}</span>
        </Link>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {restaurants.map((restaurant) => (
          <li key={restaurant.slug}>
            <Link
              href={`/dashboard/${restaurant.slug}`}
              className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow duration-150 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span aria-hidden className="size-4 shrink-0 rounded-pill" style={{ backgroundColor: restaurant.accent }} />
                <h2 className="truncate font-display text-h3 font-bold">{restaurant.name[locale]}</h2>
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
    </div>
  );
}
