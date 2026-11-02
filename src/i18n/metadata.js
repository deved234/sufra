import { locale as localeParam } from "next/root-params";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// canonical + hreflang links for a page, so search engines know the Arabic
// and English URLs are the same page in two languages.
export async function alternatesFor(href) {
  const current = await localeParam();
  const languages = Object.fromEntries(routing.locales.map((locale) => [locale, getPathname({ href, locale })]));

  return {
    canonical: languages[current],
    languages: { ...languages, "x-default": languages[routing.defaultLocale] },
  };
}
