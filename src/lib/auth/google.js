import "server-only";
import { createHash, createPublicKey } from "node:crypto";
import { verifyJwt } from "@/lib/auth/jwt";
import { SITE_URL } from "@/lib/site-url";

// "Sign in with Google": OAuth 2.0 authorization code flow with PKCE (RFC 7636),
// plus OpenID Connect for who the person is. The addresses come from Google's
// discovery document, https://accounts.google.com/.well-known/openid-configuration
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// Google only returns to redirect URIs registered for the client, and they can't
// have wildcards. Preview deployments get a new address each time, so the button
// is left out there.
export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.VERCEL_ENV !== "preview",
);

// Built from the configured site address, like email links, never from the request
const redirectUri = () => `${SITE_URL}/api/auth/google/callback`;

// PKCE: Google gets the SHA-256 of a random verifier now, and the verifier itself
// with the code later. Someone who intercepts the code can't use it without it.
export const codeChallenge = (verifier) => createHash("sha256").update(verifier).digest("base64url");

export function authorizationUrl({ state, nonce, verifier }) {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: codeChallenge(verifier),
    code_challenge_method: "S256",
    // Always show the account chooser, so someone with several accounts can pick
    prompt: "select_account",
  });
  return url.toString();
}

// Trades the one-time code for tokens. This request goes from our server straight
// to Google, with the client secret, so it never passes through the browser.
export async function exchangeCode(code, verifier) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri(),
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.id_token !== "string") {
    throw new Error(`Google token exchange failed: ${response.status} ${body.error ?? ""}`.trim());
  }
  return body.id_token;
}

// Google's public signing keys (a JWK Set). Google rotates them every few weeks and
// says how long to keep them in Cache-Control, so they're cached for that long.
let jwks = { keys: new Map(), expiresAt: 0, fetchedAt: 0 };

async function fetchKeys() {
  const response = await fetch(JWKS_URL, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!response.ok) throw new Error(`Google keys request failed: ${response.status}`);
  const { keys } = await response.json();
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("cache-control") ?? "")?.[1] ?? 0);
  const now = Date.now();
  jwks = {
    keys: new Map(
      keys
        .filter((jwk) => jwk.kty === "RSA" && (jwk.use ?? "sig") === "sig")
        .map((jwk) => [jwk.kid, createPublicKey({ key: jwk, format: "jwk" })]),
    ),
    expiresAt: now + Math.max(maxAge, 60) * 1000,
    fetchedAt: now,
  };
}

async function getKey(kid) {
  const now = Date.now();
  // An unknown kid may be a key Google started using after the last fetch. Fetch
  // again, but at most once a minute.
  if (now >= jwks.expiresAt || (!jwks.keys.has(kid) && now - jwks.fetchedAt > 60_000)) await fetchKeys();
  return jwks.keys.get(kid) ?? null;
}

// The id_token came straight from Google over TLS, which OpenID Connect accepts as
// proof on its own. Its signature is checked anyway, so nothing rests on that one
// request alone.
export function verifyIdToken(idToken, nonce) {
  return verifyJwt(idToken, { getKey, issuers: ISSUERS, audience: process.env.GOOGLE_CLIENT_ID, nonce });
}
