import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getSitemapRestaurants } from "@/lib/restaurants";
import { SITE_URL } from "@/lib/site-url";

const PAGES = ["/", "/explore", "/for-restaurants", "/contact", "/privacy", "/terms"];

// One entry per language, each naming the page's address in every language
function entries(href) {
  const address = (locale) => `${SITE_URL}${getPathname({ href, locale })}`;
  const languages = Object.fromEntries(routing.locales.map((locale) => [locale, address(locale)]));
  languages["x-default"] = address(routing.defaultLocale);
  return routing.locales.map((locale) => ({ url: address(locale), alternates: { languages } }));
}

// There's no lastModified: restaurants don't record when they last changed, and a
// made-up date is worse than none, since search engines learn to ignore it
export default async function sitemap() {
  const restaurants = await getSitemapRestaurants();
  return [
    ...PAGES,
    ...restaurants.flatMap(({ slug, dishIds }) => [`/r/${slug}`, ...dishIds.map((dishId) => `/r/${slug}/dish/${dishId}`)]),
  ].flatMap(entries);
}
