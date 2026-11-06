"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const LINKS = [
  { href: "/dashboard", key: "myRestaurants" },
  { href: "/dashboard/new", key: "newRestaurant" },
];

// Wide screens only. On a phone, the pages themselves have these: the list has its
// "new restaurant" button, and each restaurant links back to the list.
export default function OwnerNavLinks() {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  return (
    <ul className="hidden items-center gap-1 sm:flex">
      {LINKS.map(({ href, key }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={`rounded-pill px-3 py-2 text-sm font-medium hover:bg-surface-muted hover:text-foreground ${pathname === href ? "text-foreground" : "text-muted-foreground"}`}
          >
            {t(key)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
