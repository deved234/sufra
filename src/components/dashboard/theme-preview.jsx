"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { previewTheme } from "@/lib/dashboard/actions";

// The restaurant's colors on a few sample pieces, updated as the owner picks.
// The theme is computed on the server (previewTheme) and arrives as CSS variables;
// data-restaurant makes globals.css use them, in light and dark mode alike.
export default function ThemePreview({ accent, initialStyle }) {
  const t = useTranslations("Dashboard");
  const [style, setStyle] = useState(initialStyle);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(accent)) return;
    // Wait for the picker to settle instead of asking on every drag step
    const timer = setTimeout(() => {
      startTransition(async () => {
        const next = await previewTheme(accent);
        if (next) setStyle(next);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [accent]);

  return (
    <div
      data-restaurant
      style={style}
      aria-label={t("preview")}
      role="group"
      className={`overflow-hidden rounded-lg border border-border transition-opacity duration-150 ${pending ? "opacity-70" : ""}`}
    >
      <div className="flex flex-col gap-3 bg-surface-tint p-5">
        <span className="text-sm font-semibold text-brand-text">{t("preview")}</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-pill bg-cta px-5 py-2 text-sm font-semibold text-on-cta">{t("previewButton")}</span>
          <span className="rounded-pill bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-on-brand-soft">{t("previewBadge")}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 bg-surface p-5">
        <span className="font-semibold">{t("previewDish")}</span>
        <span className="font-semibold text-brand-text">{t("previewPrice")}</span>
      </div>
    </div>
  );
}
