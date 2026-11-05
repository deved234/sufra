import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { USERS } from "@/db/config";
import { routing } from "@/i18n/routing";
import { exchangeCode, googleEnabled, verifyIdToken } from "@/lib/auth/google";
import { sameState, takeFlow } from "@/lib/auth/google-flow";
import { findOrCreateGoogleUser } from "@/lib/auth/google-users";
import { localePath } from "@/lib/auth/next-path";
import { createSession } from "@/lib/auth/session";

// Google sends the browser back here with ?code=...&state=... (or ?error=...)
export async function GET(request) {
  const cookieStore = await cookies();
  const flow = takeFlow(cookieStore);
  const locale = flow?.locale ?? routing.defaultLocale;
  const go = (path) => NextResponse.redirect(new URL(localePath(locale, path), request.url));
  // Back to sign in with a message. The reason goes to the server log, never the page.
  const fail = (reason, error = "googleFailed") => {
    console.warn(`[google] sign-in refused: ${reason}`);
    return go(`/sign-in?error=${error}`);
  };

  const params = request.nextUrl.searchParams;
  if (!googleEnabled) return fail("not configured");
  // The person pressed Cancel on Google's page
  if (params.get("error") === "access_denied") return go("/sign-in?error=googleCancelled");
  if (params.has("error")) return fail(`Google returned ${params.get("error")}`);
  if (!flow) return fail("no flow cookie (expired, or started in another browser)");
  if (!sameState(params.get("state"), flow.state)) return fail("state mismatch");
  const code = params.get("code");
  if (!code) return fail("no code");

  try {
    const claims = await verifyIdToken(await exchangeCode(code, flow.verifier), flow.nonce);
    // Only addresses Google has confirmed: anything else is just text someone typed
    if (claims.email_verified !== true || typeof claims.email !== "string" || typeof claims.sub !== "string") {
      return fail("email not verified by Google");
    }
    const userId = await findOrCreateGoogleUser(claims);
    const { suspendedAt } = await getDb().collection(USERS).findOne({ _id: userId }, { projection: { suspendedAt: 1 } });
    if (suspendedAt) return go("/sign-in?error=accountSuspended");
    await createSession(userId);
  } catch (error) {
    console.error("[google] sign-in failed:", error);
    return go("/sign-in?error=googleFailed");
  }
  return go(flow.next);
}
