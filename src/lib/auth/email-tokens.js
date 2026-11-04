import "server-only";
import { getDb } from "@/db/client";
import { EMAIL_TOKENS } from "@/db/config";
import { hashToken, isTokenShaped, newToken } from "@/lib/auth/token";

// One-time links sent by email: "confirm your email" and "reset your password".
// The token is in the link; the database keeps its hash, what it's for, whose it
// is and the address it was sent to. A TTL index deletes expired ones.

const HOUR_MS = 60 * 60 * 1000;
const LIFETIME_MS = { verify: 24 * HOUR_MS, reset: HOUR_MS };

const tokens = () => getDb().collection(EMAIL_TOKENS);

export async function issueEmailToken({ userId, email, purpose }) {
  // Only the newest link works: asking again cancels the earlier ones
  await tokens().deleteMany({ userId, purpose });
  const token = newToken();
  const now = new Date();
  await tokens().insertOne({
    _id: hashToken(token),
    userId,
    email,
    purpose,
    expiresAt: new Date(now.getTime() + LIFETIME_MS[purpose]),
    createdAt: now,
  });
  return token;
}

// Finds and deletes in one atomic step, so a link opened twice at the same moment
// (or replayed) works only once. Returns { userId, email } or null.
export async function consumeEmailToken(token, purpose) {
  if (!isTokenShaped(token)) return null;
  return tokens().findOneAndDelete(
    { _id: hashToken(token), purpose, expiresAt: { $gt: new Date() } },
    { projection: { _id: 0, userId: 1, email: 1 } },
  );
}
