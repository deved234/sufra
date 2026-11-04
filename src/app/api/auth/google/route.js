import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { authorizationUrl, googleEnabled } from "@/lib/auth/google";
import { saveFlow } from "@/lib/auth/google-flow";
import { localePath, safeNext } from "@/lib/auth/next-path";
import { newToken } from "@/lib/auth/token";

// The "Continue with Google" button links here. It prepares the request and sends
// the browser to Google's account chooser.
export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const locale = routing.locales.includes(params.get("locale")) ? params.get("locale") : routing.defaultLocale;
  if (!googleEnabled) return NextResponse.redirect(new URL(localePath(locale, "/sign-in"), request.url));

  // Three random values, each 32 bytes: state (CSRF), nonce (ties the id_token to
  // this sign-in) and the PKCE verifier (43 characters, the shortest RFC 7636 allows)
  const flow = { state: newToken(), nonce: newToken(), verifier: newToken(), locale, next: safeNext(params.get("next")) };
  saveFlow(await cookies(), flow);
  return NextResponse.redirect(authorizationUrl(flow));
}
