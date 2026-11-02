import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Maps URLs to the [locale] folder: /r/x is served from /ar/r/x, /en/r/x as is,
// and /ar/... redirects to the short Arabic URL.
export default createMiddleware(routing);

export const config = {
  // Skip Next internals and files with an extension (icons, images)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
