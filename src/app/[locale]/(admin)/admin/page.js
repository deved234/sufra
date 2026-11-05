import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getOverview } from "@/lib/admin/data";
import { DailyBars, PageTitle, RestaurantStatus, ShortDate, Stat } from "@/components/admin/admin-ui";

export default async function AdminOverview() {
  await requireAdmin();
  const [data, t, status, locale] = await Promise.all([getOverview(), getTranslations("Admin"), getTranslations("Admin.status"), getLocale()]);

  return (
    <>
      <PageTitle>{t("overview")}</PageTitle>
      <section aria-label={t("overview")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("statUsers")} value={data.userCount} />
        <Stat label={t("statOwners")} value={data.ownerCount} />
        <Stat
          label={t("statRestaurants")}
          value={data.restaurantCount}
          hint={["published", "draft", "hidden", "suspended", "deleted"]
            .filter((name) => data.statuses[name])
            .map((name) => `${status(name)} ${data.statuses[name]}`)
            .join(" · ")}
        />
        <Stat label={t("statWeekBookings")} value={data.weekBookings} hint={t("statTotalBookings", { count: data.totalBookings })} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyBars title={t("chartUsers")} series={data.userSeries} />
        <DailyBars title={t("chartBookings")} series={data.bookingSeries} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-h3 font-bold">{t("latestRestaurants")}</h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {data.latestRestaurants.map((restaurant) => (
              <li key={restaurant.slug} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <Link href={`/admin/restaurants/${restaurant.slug}`} className="font-semibold hover:underline">
                  {restaurant.name[locale]}
                </Link>
                <RestaurantStatus status={restaurant.status} />
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-h3 font-bold">{t("latestUsers")}</h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {data.latestUsers.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <Link href={`/admin/users/${user.id}`} className="font-semibold hover:underline">
                  {user.name}
                </Link>
                <span className="text-muted-foreground">
                  <ShortDate value={user.createdAt} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {data.latestLog.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-h3 font-bold">{t("log")}</h2>
            <Link href="/admin/log" className="font-semibold text-brand-text hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {data.latestLog.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span>
                  <span className="font-semibold">{t.has(`actions.${entry.action}`) ? t(`actions.${entry.action}`) : entry.action}</span> · {entry.targetLabel}
                </span>
                <span className="text-muted-foreground">
                  <ShortDate value={entry.at} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
