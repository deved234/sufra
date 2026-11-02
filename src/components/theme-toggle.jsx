"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

// The theme lives on <html data-theme>, outside React, so we subscribe to it
function subscribe(callback) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getTheme = () => document.documentElement.dataset.theme;
// The server can't know the visitor's theme
const getServerTheme = () => null;

// compact: icon only on phones, for headers with little room (the label stays for screen readers)
export default function ThemeToggle({ compact = false }) {
  const t = useTranslations("Theme");
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  const toLight = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-2 whitespace-nowrap rounded-pill border border-border-strong py-2 text-sm font-medium transition-colors duration-150 hover:bg-surface-muted ${
        compact ? "px-2.5 sm:px-4" : "px-4"
      }`}
    >
      {compact && (
        <svg viewBox="0 0 24 24" className="size-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {toLight ? (
            <path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5 19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5 19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
          ) : (
            <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
          )}
        </svg>
      )}
      <span className={compact ? "max-sm:sr-only" : undefined}>{toLight ? t("toLight") : t("toDark")}</span>
    </button>
  );
}
