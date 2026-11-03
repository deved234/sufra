import "server-only";
import { cache } from "react";
import { getDb } from "@/db/client";
import { USERS } from "@/db/config";
import { redirect } from "@/i18n/navigation";
import { extendSession, getSessionUserId } from "@/lib/auth/session";
import { locale as localeParam } from "next/root-params";

// Data Access Layer: the one place that turns the session cookie into a user.
// Pages and Server Actions ask here instead of reading cookies themselves, and get
// back only safe fields (never the password hash). cache() dedupes the lookup
// within one request when several components ask.

export const getCurrentUser = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await getDb()
    .collection(USERS)
    .findOne({ _id: userId }, { projection: { name: 1, email: 1 } });
  return user ? { id: user._id.toString(), name: user.name, email: user.email } : null;
});

// For Server Actions: the current user, keeping an active session alive
export async function getActionUser() {
  const user = await getCurrentUser();
  if (user) await extendSession();
  return user;
}

// For pages: send signed-out visitors to sign in, then back here
export async function requireUser(next) {
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: { pathname: "/sign-in", query: next ? { next } : {} }, locale: await localeParam() });
  }
  return user;
}
