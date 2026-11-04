import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Secrets handed to the browser or sent by email: session cookies, email links.
// 32 random bytes can't be guessed, and only their SHA-256 is stored, so a leaked
// database holds nothing that works as a cookie or a link. (A fast hash is enough
// here, unlike passwords: the input is random, not something a person picked.)

export const newToken = () => randomBytes(32).toString("base64url");

export const hashToken = (token) => createHash("sha256").update(token).digest("hex");

// 32 bytes are 43 base64url characters. Anything else isn't one of ours.
export const isTokenShaped = (value) => typeof value === "string" && /^[\w-]{43}$/.test(value);
