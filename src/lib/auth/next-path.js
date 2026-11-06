import { routing } from "@/i18n/routing";

// Where to go after signing in (?next=). Only same-site paths, never "//evil.com"
// or "https://...", so the sign-in page can't be used to send people elsewhere.
// With nothing asked for, /start picks the right page for the account.
export function safeNext(value) {
  return typeof value === "string" && /^\/(?!\/)[\w\-/?=&.%]*$/.test(value) ? value : "/start";
}

// The restaurant owners' entrance: signing in or up there continues to this
export const OWNER_NEXT = "/start?as=owner";

// The address of a page in a language, for code outside the [locale] routes:
// Arabic keeps the plain path, English gets /en in front
export function localePath(locale, path) {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}
