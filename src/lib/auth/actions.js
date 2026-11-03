"use server";

import { getDb } from "@/db/client";
import { USERS } from "@/db/config";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { burnTime, hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
import { clear, clientIp, hit, isLimited, LIMITS } from "@/lib/auth/rate-limit";
import { createSession, deleteSession } from "@/lib/auth/session";
import { fieldErrors, signInSchema, signUpSchema } from "@/lib/validation/auth";

// Server Actions run with whatever the browser sends, so everything is checked here.
// Results carry message keys ("Form.errors.*") that the form translates.

// Root params aren't available in Server Actions, so the form sends its language
function formLocale(formData) {
  const locale = formData.get("locale");
  return routing.locales.includes(locale) ? locale : routing.defaultLocale;
}

// Only same-site paths, never "//evil.com" or "https://..."
function safeNext(value) {
  return typeof value === "string" && /^\/(?!\/)[\w\-/?=&.%]*$/.test(value) ? value : "/dashboard";
}

export async function signUp(_previous, formData) {
  const values = { name: formData.get("name") ?? "", email: formData.get("email") ?? "" };
  const parsed = signUpSchema.safeParse({ ...values, password: formData.get("password") ?? "" });
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const { name, email, password } = parsed.data;
  // Every account creation counts, so one address can't mass-produce accounts
  const signUpKey = `signup:ip:${await clientIp()}`;
  if (await isLimited(signUpKey, LIMITS.signUpIp)) return { values, error: "tooManyAttempts" };
  await hit(signUpKey, LIMITS.signUpIp);

  let userId;
  try {
    const result = await getDb()
      .collection(USERS)
      .insertOne({ email, name, passwordHash: await hashPassword(password), createdAt: new Date() });
    userId = result.insertedId;
  } catch (error) {
    if (error.code === 11000) return { values, errors: { email: "emailTaken" } };
    throw error;
  }

  await createSession(userId);
  redirect({ href: "/dashboard/new", locale: formLocale(formData) });
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
  const user = await users.findOne({ email }, { projection: { passwordHash: 1 } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await burnTime(password), false);
  if (!valid) {
    await Promise.all(keys.map(([key, limit]) => hit(key, limit)));
    // Same message either way: don't reveal whether the email has an account
    return { values, error: "wrongCredentials" };
  }

  // A correct password clears this person's counters, not the address-wide one
  await Promise.all([clear(keys[0][0]), clear(keys[1][0])]);
  // Hashes made with older, weaker settings are upgraded while the password is at hand
  if (needsRehash(user.passwordHash)) {
    await users.updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(password) } });
  }
  await createSession(user._id);
  redirect({ href: safeNext(formData.get("next")), locale: formLocale(formData) });
}

export async function signOut(formData) {
  await deleteSession();
  redirect({ href: "/", locale: formLocale(formData) });
}
