import { routing } from "@/i18n/routing";

// Where to go after signing in (?next=). Only same-site paths, never "//evil.com"
// or "https://...", so the sign-in page can't be used to send people elsewhere.
export function safeNext(value) {
  return typeof value === "string" && /^\/(?!\/)[\w\-/?=&.%]*$/.test(value) ? value : "/dashboard";
}

// The address of a page in a language, for code outside the [locale] routes:
// Arabic keeps the plain path, English gets /en in front
export function localePath(locale, path) {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}
