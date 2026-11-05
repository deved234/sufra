"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const LINKS = [
  { href: "/admin", key: "overview" },
  { href: "/admin/restaurants", key: "restaurants" },
  { href: "/admin/users", key: "users" },
  { href: "/admin/bookings", key: "bookings" },
  { href: "/admin/log", key: "log" },
];

// A column on wide screens, a scrolling row on phones
export default function AdminNav() {
  const t = useTranslations("Admin");
  const pathname = usePathname();
  const active = (href) => (href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav aria-label={t("title")} className="overflow-x-auto md:w-48 md:shrink-0">
      <ul className="flex gap-1 md:flex-col">
        {LINKS.map(({ href, key }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors duration-150 ${active(href) ? "bg-brand-soft text-on-brand-soft" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}
            >
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
