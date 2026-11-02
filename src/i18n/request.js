import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as localeParam } from "next/root-params";
import { routing } from "@/i18n/routing";

// next-intl asks this for the current language and its messages.
// The language is read from the [locale] root param, not from request headers,
// so pages using translations can still be prerendered at build time.
export default getRequestConfig(async () => {
  const requested = await localeParam();
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Asia/Riyadh",
  };
});
