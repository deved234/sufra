import "server-only";
import { verify } from "node:crypto";

// Checks a signed JSON Web Token (RFC 7519) and returns its claims. A JWT is three
// base64url parts, header.payload.signature, and the signature covers the first two
// exactly as they were sent. Only RS256 (RSA with SHA-256) is accepted: the token
// names its own algorithm, so trusting that field is how "alg: none" tokens and
// algorithm-confusion attacks (an RSA public key used as an HMAC secret) get through.

export class JwtError extends Error {}

// Clocks drift: a minute of tolerance on the time claims
const SKEW_SECONDS = 60;

function decodePart(part) {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    throw new JwtError("malformed");
  }
}

// getKey(kid) returns the KeyObject the issuer signed with, or null
export async function verifyJwt(token, { getKey, issuers, audience, nonce, now = Date.now() }) {
  const parts = typeof token === "string" ? token.split(".") : [];
  if (parts.length !== 3) throw new JwtError("malformed");
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = decodePart(headerPart);
  const payload = decodePart(payloadPart);

  if (header.alg !== "RS256") throw new JwtError("algorithm");
  const key = await getKey(header.kid);
  if (!key) throw new JwtError("unknown key");
  // For an RSA key, crypto.verify uses PKCS#1 v1.5 padding, which is what RS256 is
  const signed = Buffer.from(`${headerPart}.${payloadPart}`);
  if (!verify("sha256", signed, key, Buffer.from(signaturePart, "base64url"))) throw new JwtError("signature");

  // A valid signature only says the issuer made this token. The claims say whether
  // it was made for us, for this sign-in, and is still current.
  const seconds = now / 1000;
  if (!issuers.includes(payload.iss)) throw new JwtError("issuer");
  // Our client id only: a token Google made for another site must not work here
  if (payload.aud !== audience) throw new JwtError("audience");
  if (typeof payload.exp !== "number" || payload.exp + SKEW_SECONDS < seconds) throw new JwtError("expired");
  if (typeof payload.iat !== "number" || payload.iat - SKEW_SECONDS > seconds) throw new JwtError("issued in the future");
  // The nonce ties the token to the sign-in this browser started, so an old token
  // can't be replayed
  if (nonce !== undefined && payload.nonce !== nonce) throw new JwtError("nonce");
  return payload;
}
