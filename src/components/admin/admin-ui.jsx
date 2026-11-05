import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/booking-slots";

// Shared pieces of the admin panel. Filters are plain GET forms and links, so the
// state is in the URL and they work without JavaScript.

export function PageTitle({ children, count }) {
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <h1 className="font-display text-h2 font-extrabold">{children}</h1>
      {count !== undefined && <span className="text-muted-foreground">{count}</span>}
    </div>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-display text-h2 font-extrabold">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

const fieldClass = "rounded-md border border-border-strong bg-surface px-3 py-2 text-sm focus-visible:border-ring";

export function FilterForm({ query, placeholder, selects = [], date }) {
  const t = useTranslations("Admin");
  return (
    <form role="search" className="flex flex-wrap items-end gap-2">
      <input type="search" name="q" aria-label={t("search")} defaultValue={query.q ?? ""} placeholder={placeholder} className={`${fieldClass} min-w-48 flex-1`} />
      {selects.map(({ name, label, options }) => (
        <select key={name} name={name} aria-label={label} defaultValue={query[name] ?? ""} className={fieldClass}>
          <option value="">{label}</option>
          {options.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      ))}
      {date && <input type="date" name="date" aria-label={t("date")} dir="ltr" defaultValue={query.date ?? ""} className={fieldClass} />}
      <button type="submit" className="rounded-pill border border-border-strong px-5 py-2 text-sm font-semibold hover:bg-surface-muted">
        {t("search")}
      </button>
    </form>
  );
}

export function Pagination({ pathname, query, page, pages }) {
  const t = useTranslations("Admin");
  if (pages <= 1) return null;
  const href = (target) => ({ pathname, query: { ...query, page: target } });
  return (
    <nav aria-label={t("pages")} className="flex items-center justify-center gap-3 text-sm">
      {page > 1 && (
        <Link href={href(page - 1)} className="rounded-pill border border-border-strong px-4 py-2 font-semibold hover:bg-surface-muted">
          {t("previous")}
        </Link>
      )}
      <span className="text-muted-foreground">{t("pageOf", { page, pages })}</span>
      {page < pages && (
        <Link href={href(page + 1)} className="rounded-pill border border-border-strong px-4 py-2 font-semibold hover:bg-surface-muted">
          {t("next")}
        </Link>
      )}
    </nav>
  );
}

// Wide tables scroll inside their box, never the whole page
export function Table({ headers, children, empty }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="px-4 py-3 text-start font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-muted-foreground">{empty}</p>}
    </div>
  );
}

const STATUS_COLORS = {
  published: "bg-success-soft text-success",
  draft: "bg-surface-muted text-muted-foreground",
  hidden: "bg-surface-muted text-muted-foreground",
  suspended: "bg-danger-soft text-danger",
  deleted: "bg-danger-soft text-danger",
};

export function RestaurantStatus({ status }) {
  const t = useTranslations("Admin.status");
  return <span className={`inline-block whitespace-nowrap rounded-pill px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>{t(status)}</span>;
}

export function ShortDate({ value }) {
  const locale = useLocale();
  if (!value) return <span aria-hidden>–</span>;
  const date = value.slice(0, 10);
  return <span className="whitespace-nowrap">{formatDate(date, locale, { day: "numeric", month: "short", year: "numeric" })}</span>;
}

// Bars for a month of daily counts. Drawn by hand: an SVG sized by its numbers. Time
// runs in the reading direction. Each bar names its day and count when hovered.
export function DailyBars({ title, series }) {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const max = Math.max(1, ...series.map((point) => point.count));
  const total = series.reduce((sum, point) => sum + point.count, 0);
  const barWidth = 100 / series.length;
  return (
    <figure className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <figcaption className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">{title}</span>
        <span className="text-muted-foreground">{t("last30", { total })}</span>
      </figcaption>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={`${title}: ${t("last30", { total })}`} className="h-24 w-full rtl:-scale-x-100">
        {series.map((point, index) => {
          const height = point.count ? Math.max((point.count / max) * 30, 1) : 0.4;
          return (
            <rect key={point.date} x={index * barWidth + barWidth * 0.1} y={30 - height} width={barWidth * 0.8} height={height} className={point.count ? "fill-brand" : "fill-border"}>
              <title>{`${formatDate(point.date, locale, { day: "numeric", month: "short" })}: ${point.count}`}</title>
            </rect>
          );
        })}
      </svg>
    </figure>
  );
}
