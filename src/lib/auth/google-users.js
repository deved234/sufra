import "server-only";
import { getDb } from "@/db/client";
import { USERS } from "@/db/config";
import { deleteUserSessions } from "@/lib/auth/session";

// Turns a checked Google id_token into one of our users. The Google account is
// identified by `sub`, its permanent id, not by email: people change addresses.
export async function findOrCreateGoogleUser(claims) {
  const users = getDb().collection(USERS);
  const googleId = claims.sub;
  const email = claims.email.toLowerCase();

  // 1. Signed in with this Google account before
  const known = await users.findOne({ googleId }, { projection: { _id: 1 } });
  if (known) return known._id;

  // 2. An account with the same email, made with a password: Google has confirmed
  // this person owns the address, so the Google account is added to it
  const existing = await users.findOne({ email }, { projection: { googleId: 1, emailVerifiedAt: 1 } });
  if (existing) {
    // Already tied to a different Google account (an address can be recycled)
    if (existing.googleId) throw new Error("The email belongs to another Google account");

    // If the email was never confirmed, the password wasn't necessarily set by
    // this person: anyone could have signed up with their address first, waiting
    // for them to arrive ("account pre-hijacking"). That password is removed and
    // any sessions made with it end. The owner can set one through "forgot password".
    const confirmed = Boolean(existing.emailVerifiedAt);
    const update = confirmed
      ? { $set: { googleId } }
      : { $set: { googleId, emailVerifiedAt: new Date() }, $unset: { passwordHash: "" } };
    const { matchedCount } = await users.updateOne({ _id: existing._id, googleId: { $exists: false } }, update);
    if (!matchedCount) throw new Error("The account changed during sign-in");
    if (!confirmed) await deleteUserSessions(existing._id);
    return existing._id;
  }

  // 3. New here: an account with a confirmed email and no password
  const name = (typeof claims.name === "string" ? claims.name.trim() : "").slice(0, 80) || email.split("@")[0].slice(0, 80);
  const now = new Date();
  const { insertedId } = await users.insertOne({ email, name, googleId, emailVerifiedAt: now, createdAt: now });
  return insertedId;
}
