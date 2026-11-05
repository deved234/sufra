import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRestaurantBar } from "@/lib/booking/owner-data";
import { StatusBar } from "@/components/dashboard/restaurant-status";

// Title and tabs on each restaurant page of the dashboard
export default async function RestaurantNav({ slug, name, current }) {
  const [t, { unseen, status, upcoming }] = await Promise.all([getTranslations("Dashboard"), getRestaurantBar(slug)]);
  const tabs = [
    { key: "overview", href: `/dashboard/${slug}` },
    { key: "menu", href: `/dashboard/${slug}/menu` },
    { key: "bookings", href: `/dashboard/${slug}/bookings` },
    { key: "settings", href: `/dashboard/${slug}/settings` },
  ];

  return (
    <div className="mb-8 flex flex-col gap-4">
      <Link href="/dashboard" className="self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        <span aria-hidden className="inline-block rtl:-scale-x-100">
          ←
        </span>{" "}
        {t("back")}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h2 font-extrabold">{name}</h1>
        <Link
          // Only a published restaurant has a public page to open
          href={status === "published" ? `/r/${slug}` : `/dashboard/${slug}/preview`}
          className="rounded-pill border border-border-strong px-4 py-2 text-sm font-semibold transition-colors duration-150 hover:bg-surface-muted"
        >
          {t("viewSite")}
        </Link>
      </div>
      <StatusBar slug={slug} status={status} upcoming={upcoming} />
      <nav aria-label={name} className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={tab.key === current ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${
              tab.key === current ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(tab.key)}
            {tab.key === "bookings" && unseen > 0 && (
              <span className="ms-1.5 rounded-pill bg-danger px-1.5 py-0.5 text-xs font-bold text-background" aria-label={t("newCount", { count: unseen })}>
                {unseen}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
