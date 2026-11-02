"use client";

import { useLocale, useTranslations } from "next-intl";
import { getPathname, usePathname } from "@/i18n/navigation";

// Links to the same page in the other language. A real link, so it works
// before hydration and crawlers can follow it.
export default function LocaleSwitcher({ className = "" }) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "ar" ? "en" : "ar";
  const href = getPathname({ href: pathname, locale: other });

  // A full page load on purpose, not client navigation: the new language replaces
  // <html lang dir>, which would also drop the data-theme set by the theme script.
  // Also keeps ?category=... and #menu, read on click so no Suspense is needed.
  function onClick(event) {
    event.preventDefault();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full load is the point
    window.location.assign(`${href}${window.location.search}${window.location.hash}`);
  }

  return (
    <a
      href={href}
      onClick={onClick}
      hrefLang={other}
      className={`whitespace-nowrap rounded-pill border border-border-strong px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-surface-muted ${className}`}
    >
      {/* The name is written in its own language, so screen readers switch voice */}
      <span lang={other}>{t("label")}</span>
    </a>
  );
}
