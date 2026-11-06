"use server";

import { ObjectId } from "mongodb";
import { after } from "next/server";
import { getDb } from "@/db/client";
import { USERS } from "@/db/config";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/dal";
import { consumeEmailToken } from "@/lib/auth/email-tokens";
import { sendAccountExists, sendPasswordReset, sendVerification } from "@/lib/auth/emails";
import { safeNext } from "@/lib/auth/next-path";
import { burnTime, hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
import { clear, clientIp, hit, isLimited, LIMITS } from "@/lib/auth/rate-limit";
import { createSession, deleteSession, deleteUserSessions } from "@/lib/auth/session";
import { fieldErrors, forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation/auth";

// Server Actions run with whatever the browser sends, so everything is checked here.
// Results carry message keys ("Form.errors.*") that the form translates.

// Root params aren't available in Server Actions, so the form sends its language
function formLocale(formData) {
  const locale = formData.get("locale");
  return routing.locales.includes(locale) ? locale : routing.defaultLocale;
}

// Sets emailVerifiedAt unless it's already set ($ifNull keeps the first date)
const markVerified = { emailVerifiedAt: { $ifNull: ["$emailVerifiedAt", "$$NOW"] } };

export async function signUp(_previous, formData) {
  const values = { name: formData.get("name") ?? "", email: formData.get("email") ?? "" };
  const parsed = signUpSchema.safeParse({ ...values, password: formData.get("password") ?? "" });
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const { name, email, password } = parsed.data;
  // Every account creation counts, so one address can't mass-produce accounts
  const signUpKey = `signup:ip:${await clientIp()}`;
  if (await isLimited(signUpKey, LIMITS.signUpIp)) return { values, error: "tooManyAttempts" };
  await hit(signUpKey, LIMITS.signUpIp);

  const locale = formLocale(formData);
  const next = formData.get("next");
  const passwordHash = await hashPassword(password);
  try {
    const { insertedId } = await getDb()
      .collection(USERS)
      .insertOne({ email, name, passwordHash, emailVerifiedAt: null, createdAt: new Date() });
    after(() => sendVerification({ _id: insertedId, email, name }, locale, next ? safeNext(next) : undefined));
  } catch (error) {
    if (error.code !== 11000) throw error;
    // The email already has an account. The answer is exactly the one a new account
    // gets, so this form can't be used to find out who has an account here. The
    // owner hears about it by email instead.
    after(() => sendAccountExists(email, locale));
  }

  // No session yet: the confirmation link signs the new owner in
  redirect({ href: "/verify-email", locale });
}

export async function signIn(_previous, formData) {
  const values = { email: formData.get("email") ?? "" };
  const parsed = signInSchema.safeParse({ ...values, password: formData.get("password") ?? "" });
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const { email, password } = parsed.data;
  const ip = await clientIp();
  const keys = [
    [`signin:email-ip:${email}|${ip}`, LIMITS.signInPair],
    [`signin:email:${email}`, LIMITS.signInEmail],
    [`signin:ip:${ip}`, LIMITS.signInIp],
  ];
  for (const [key, limit] of keys) {
    if (await isLimited(key, limit)) return { values, error: "tooManyAttempts" };
  }

  const users = getDb().collection(USERS);
  const user = await users.findOne({ email }, { projection: { passwordHash: 1, suspendedAt: 1, suspendedReason: 1 } });
  // An account made with Google has no password until its owner sets one through
  // "forgot password". It gets the same answer and timing as a wrong password.
  const valid = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : (await burnTime(password), false);
  if (!valid) {
    await Promise.all(keys.map(([key, limit]) => hit(key, limit)));
    // Same message either way: don't reveal whether the email has an account
    return { values, error: "wrongCredentials" };
  }

  // Told only after the right password, so this doesn't reveal anything about the email
  if (user.suspendedAt) return { values, error: "accountSuspended", suspendedReason: user.suspendedReason };

  // A correct password clears this person's counters, not the address-wide one
  await Promise.all([clear(keys[0][0]), clear(keys[1][0])]);
  // Hashes made with older, weaker settings are upgraded while the password is at hand
  if (needsRehash(user.passwordHash)) {
    await users.updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(password) } });
  }
  await createSession(user._id);
  // An unconfirmed account is sent on from the next page to confirm first
  redirect({ href: safeNext(formData.get("next")), locale: formLocale(formData) });
}

export async function signOut(formData) {
  await deleteSession();
  redirect({ href: "/", locale: formLocale(formData) });
}

// The button on /confirm-email. Opening the link only shows the page: mail apps and
// link scanners open links by themselves, and that mustn't use up the token.
export async function confirmEmail(_previous, formData) {
  const record = await consumeEmailToken(formData.get("token"), "verify");
  if (!record) return { error: "linkInvalid" };

  // The link proves the address it was sent to, so it only applies while the
  // account still has that address
  const { matchedCount } = await getDb()
    .collection(USERS)
    .updateOne({ _id: record.userId, email: record.email }, [{ $set: markVerified }]);
  if (!matchedCount) return { error: "linkInvalid" };

  // Owning the inbox is proof enough to sign in, like a password reset
  const current = await getCurrentUser();
  if (current?.id !== record.userId.toString()) await createSession(record.userId);
  redirect({ href: safeNext(formData.get("next")), locale: formLocale(formData) });
}

export async function resendVerification(_previous, formData) {
  const locale = formLocale(formData);
  const user = await getCurrentUser();
  if (!user) return { error: "signedOut" };
  if (user.verified) redirect({ href: "/start", locale });

  const key = `verify:user:${user.id}`;
  if (await isLimited(key, LIMITS.verifyResend)) return { error: "tooManyAttempts" };
  await hit(key, LIMITS.verifyResend);

  const next = formData.get("next");
  after(() => sendVerification({ _id: new ObjectId(user.id), email: user.email, name: user.name }, locale, next ? safeNext(next) : undefined));
  return { sent: Date.now() };
}

export async function requestPasswordReset(_previous, formData) {
  const values = { email: formData.get("email") ?? "" };
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const { email } = parsed.data;
  const keys = [
    [`reset:ip:${await clientIp()}`, LIMITS.resetIp],
    [`reset:email:${email}`, LIMITS.resetEmail],
  ];
  for (const [key, limit] of keys) {
    if (await isLimited(key, limit)) return { values, error: "tooManyAttempts" };
  }
  await Promise.all(keys.map(([key, limit]) => hit(key, limit)));

  // Looking the email up happens after the response too, so the answer and its
  // timing are the same whether or not the email has an account
  const locale = formLocale(formData);
  after(async () => {
    const user = await getDb().collection(USERS).findOne({ email }, { projection: { email: 1 } });
    if (user) await sendPasswordReset(user, locale);
  });
  return { sent: true };
}

export async function resetPassword(_previous, formData) {
  // Checked before the token is used, so a too-short password doesn't waste the link
  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password") ?? "" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const record = await consumeEmailToken(formData.get("token"), "reset");
  if (!record) return { error: "linkInvalid" };

  const passwordHash = await hashPassword(parsed.data.password);
  // Opening the link proves the inbox too, so the email counts as confirmed.
  // $literal: in an update pipeline a string starting with "$" would be read as a field.
  const { matchedCount } = await getDb()
    .collection(USERS)
    .updateOne({ _id: record.userId, email: record.email }, [
      { $set: { passwordHash: { $literal: passwordHash }, ...markVerified } },
    ]);
  if (!matchedCount) return { error: "linkInvalid" };

  // Whoever was signed in with the old password (maybe the reason for the reset)
  // is signed out everywhere, and this device gets a fresh session
  await deleteUserSessions(record.userId);
  await Promise.all([clear(`signin:email:${record.email}`), createSession(record.userId)]);
  redirect({ href: "/start", locale: formLocale(formData) });
}
