"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import AccountLinks from "@/components/account-links";
import LocaleSwitcher from "@/components/locale-switcher";
import NavLinks from "@/components/nav-links";
import ThemeToggle from "@/components/theme-toggle";

export default function MobileMenu() {
  const t = useTranslations("Site");
  const [open, setOpen] = useState(false);

  // Escape closes the menu
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? t("closeMenu") : t("openMenu")}
        className="flex size-10 items-center justify-center rounded-pill border border-border-strong transition-colors duration-150 hover:bg-surface-muted"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-b border-border bg-surface px-6 py-4 shadow-md"
        >
          <NavLinks
            className="flex flex-col gap-1"
            linkClassName="block px-4 py-3"
            onNavigate={() => setOpen(false)}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LocaleSwitcher />
            </div>
            <AccountLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
