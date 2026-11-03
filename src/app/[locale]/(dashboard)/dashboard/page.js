import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getMyRestaurants } from "@/lib/dashboard/data";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("title") };
}

export default async function DashboardHome() {
  const user = await requireUser("/dashboard");
  const [restaurants, t, menu, locale] = await Promise.all([
    getMyRestaurants(user.id),
    getTranslations("Dashboard"),
    getTranslations("Menu"),
    getLocale(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-text">{t("hello", { name: user.name })}</p>
          <h1 className="font-display text-h2 font-extrabold">{t("myRestaurants")}</h1>
        </div>
        {restaurants.length > 0 && (
          <Link
            href="/dashboard/new"
            className="rounded-pill bg-cta px-5 py-2.5 text-sm font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
          >
            {t("newRestaurant")}
          </Link>
        )}
      </div>

      {restaurants.length === 0 ? (
        <section className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border-strong bg-surface p-8">
          <h2 className="font-display text-h3 font-bold">{t("emptyTitle")}</h2>
          <p className="max-w-md text-muted-foreground">{t("emptyBody")}</p>
          <Link
            href="/dashboard/new"
            className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
          >
            {t("start")}
          </Link>
        </section>
      ) : (
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
