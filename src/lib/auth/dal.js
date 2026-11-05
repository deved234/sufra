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
    .findOne({ _id: userId }, { projection: { name: 1, email: 1, phone: 1, emailVerifiedAt: 1 } });
  if (!user) return null;
  return { id: user._id.toString(), name: user.name, email: user.email, phone: user.phone ?? "", verified: Boolean(user.emailVerifiedAt) };
});

// For dashboard Server Actions: the current user if they may use the dashboard
// (confirmed email), keeping an active session alive. Null otherwise.
export async function getActionUser() {
  const user = await getCurrentUser();
  if (!user?.verified) return null;
  await extendSession();
  return user;
}

// For dashboard pages: signed-out visitors go to sign in (and come back here
// after), and accounts that haven't confirmed their email go to do that first
export async function requireUser(next) {
  const user = await getCurrentUser();
  const locale = await localeParam();
  if (!user) redirect({ href: { pathname: "/sign-in", query: next ? { next } : {} }, locale });
  if (!user.verified) redirect({ href: "/verify-email", locale });
  return user;
}
