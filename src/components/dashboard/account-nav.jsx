"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const LINKS = [
  { href: "/dashboard", key: "navHome" },
  { href: "/dashboard/bookings", key: "myBookings" },
  { href: "/dashboard/favorites", key: "favorites" },
  { href: "/dashboard/account", key: "account" },
];

function isActive(pathname, href) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

// In the header on wide screens, and as a bar along the bottom on phones, where the
// header has no room and a thumb reaches
export function AccountNavLinks() {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  return (
    <ul className="hidden items-center gap-1 sm:flex">
      {LINKS.map(({ href, key }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={`rounded-pill px-3 py-2 text-sm font-medium hover:bg-surface-muted hover:text-foreground ${isActive(pathname, href) ? "text-foreground" : "text-muted-foreground"}`}
          >
            {t(key)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AccountBottomNav() {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  return (
    <nav aria-label={t("accountNav")} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background sm:hidden">
      <ul className="grid grid-cols-4">
        {LINKS.map(({ href, key }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={`flex h-14 items-center justify-center text-xs font-semibold ${isActive(pathname, href) ? "text-brand-text" : "text-muted-foreground"}`}
            >
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
