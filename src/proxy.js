import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Maps URLs to the [locale] folder: /r/x is served from /ar/r/x, /en/r/x as is,
// and /ar/... redirects to the short Arabic URL.
const handleI18n = createMiddleware(routing);

const hasLocalePrefix = (path) => routing.locales.some((locale) => path === `/${locale}` || path.startsWith(`/${locale}/`));

export default function proxy(request) {
  // On client navigation the router sends the page it comes from in the Next-Url
  // header, and Next.js decides from it whether to intercept (open the dish modal).
  // Intercepting routes are matched against the internal /[locale]/... paths, but
  // Arabic URLs have no prefix, so add it here. next-intl forwards these headers.
  const from = request.headers.get("next-url");
  if (from && !hasLocalePrefix(from)) {
    const headers = new Headers(request.headers);
    headers.set("next-url", `/${routing.defaultLocale}${from === "/" ? "" : from}`);
    request = new NextRequest(request, { headers });
  }

  return handleI18n(request);
}

export const config = {
  // Skip Next internals and files with an extension (icons, images)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
