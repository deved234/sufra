import { defineRouting } from "next-intl/routing";

// Arabic is the main language and keeps the plain URLs (/r/bait-alkabsa).
// English lives under /en. The URL alone decides the language: no redirects
// based on the browser's language and no cookie, so every page stays cacheable.
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
});

export const directions = { ar: "rtl", en: "ltr" };
