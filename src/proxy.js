import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Maps URLs to the [locale] folder: /r/x is served from /ar/r/x, /en/r/x as is,
// and /ar/... redirects to the short Arabic URL.
const handleI18n = createMiddleware(routing);

const hasLocalePrefix = (path) => routing.locales.some((locale) => path === `/${locale}` || path.startsWith(`/${locale}/`));
const DASHBOARD = /^(\/en)?\/dashboard(\/|$)/;

export default function proxy(request) {
  // A quick check only: no session cookie means no point rendering the dashboard.
  // Whether the session is real is checked on the server by the Data Access Layer
  // (src/lib/auth/dal.js) and again in every Server Action.
  // Page visits only: a Server Action is a POST to the same URL, and redirecting
  // it would hide the action's own answer ("your session ended") behind an error.
  const { pathname, search } = request.nextUrl;
  const dashboard = pathname.match(DASHBOARD);
  if (dashboard && request.method === "GET" && !request.cookies.has(SESSION_COOKIE)) {
    const signIn = new URL(`${dashboard[1] ?? ""}/sign-in`, request.url);
    signIn.searchParams.set("next", pathname.replace(/^\/en(?=\/)/, "") + search);
    return NextResponse.redirect(signIn);
  }

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
