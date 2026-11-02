"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { siteLinks } from "@/components/site-nav";

// Client only because it reads the current path to highlight the active link.
// next-intl's usePathname returns the path without /en, so it matches link.href.
export default function NavLinks({ className = "", linkClassName = "", onNavigate }) {
  const t = useTranslations("Site");
  const pathname = usePathname();

  return (
    <ul className={className}>
      {siteLinks.map((link) => {
        const active = pathname === link.href;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`rounded-pill font-medium transition-colors duration-150 ${
                active
                  ? "bg-brand-soft text-on-brand-soft"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              } ${linkClassName}`}
            >
              {t(link.labelKey)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
