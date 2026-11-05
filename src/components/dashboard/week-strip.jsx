import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/booking-slots";

// The coming week at a glance: how many bookings and how full, each day a link to it.
export default function WeekStrip({ slug, days, current }) {
  const t = useTranslations("Bookings");
  const locale = useLocale();

  return (
    <nav aria-label={t("weekTitle")}>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {days.map((day, index) => (
          <li key={day.date}>
            <Link
              href={{ pathname: `/dashboard/${slug}/bookings`, query: { date: day.date } }}
              aria-current={day.date === current ? "date" : undefined}
              aria-label={`${formatDate(day.date, locale)}: ${t("count", { count: day.count })}`}
              className={`flex h-full flex-col items-center gap-1 rounded-md border p-2 text-center transition-colors duration-150 ${
                day.date === current ? "border-brand bg-brand-soft" : "border-border bg-surface hover:bg-surface-muted"
              }`}
            >
              <span className="text-xs font-medium text-muted-foreground">{index === 0 ? t("today") : formatDate(day.date, locale, { weekday: "short" })}</span>
              <span className="font-bold">{formatDate(day.date, locale, { day: "numeric" })}</span>
              <span className="text-xs">{day.count}</span>
              <span aria-hidden className="h-1 w-full overflow-hidden rounded-pill bg-surface-muted">
                <span style={{ width: `${day.fill * 100}%` }} className={`block h-full ${day.fill >= 1 ? "bg-danger" : "bg-brand"}`} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
