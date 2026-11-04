import "server-only";
import { timingSafeEqual } from "node:crypto";

// What the browser must bring back from Google: state, nonce and the PKCE verifier,
// plus where to go after. It lives in a short cookie that only the Google routes
// see. SameSite=Lax, not Strict: coming back from Google is a navigation from
// another site, and Strict would leave the cookie behind.
export const FLOW_COOKIE = "sufra_google";
const FLOW_PATH = "/api/auth/google";
const FLOW_SECONDS = 10 * 60;

const options = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: FLOW_PATH,
  maxAge,
});

export function saveFlow(cookieStore, flow) {
  cookieStore.set(FLOW_COOKIE, Buffer.from(JSON.stringify(flow)).toString("base64url"), options(FLOW_SECONDS));
}

// Read once: the cookie is cleared whatever happens next
export function takeFlow(cookieStore) {
  const value = cookieStore.get(FLOW_COOKIE)?.value;
  cookieStore.set(FLOW_COOKIE, "", options(0));
  if (!value) return null;
  try {
    const flow = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return ["state", "nonce", "verifier", "locale", "next"].every((key) => typeof flow[key] === "string") ? flow : null;
  } catch {
    return null;
  }
}

// state protects against CSRF: a callback this browser didn't start is refused.
// Compared in constant time, like every secret.
export function sameState(received, expected) {
  if (typeof received !== "string") return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
