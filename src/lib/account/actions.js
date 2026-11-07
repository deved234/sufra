"use server";

import { ObjectId } from "mongodb";
import { refresh } from "next/cache";
import { after } from "next/server";
import { getDb } from "@/db/client";
import { BOOKINGS, EMAIL_TOKENS, RESTAURANTS, USERS } from "@/db/config";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getActionUser, getCurrentUser } from "@/lib/auth/dal";
import { consumeEmailToken, issueEmailToken } from "@/lib/auth/email-tokens";
import { sendAccountExists, sendEmailChange, sendEmailChangedNotice, sendOwnerCancellationNotice, sendPasswordReset } from "@/lib/auth/emails";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hit, isLimited, LIMITS } from "@/lib/auth/rate-limit";
import { createSession, deleteOtherSessions, deleteSession } from "@/lib/auth/session";
import { releaseSeats } from "@/lib/booking/seats";
import { changeEmailSchema, changePasswordSchema, profileSchema } from "@/lib/validation/account";
import { fieldErrors } from "@/lib/validation/auth";
import { idSchema } from "@/lib/validation/menu";

// Each action checks who is calling. Changes that could take over an account (the
// password, the email, deleting it) also ask for the password, because an open
// session alone doesn't prove who is at the keyboard.

const MAX_FAVORITES = 200;
const MAX_FAVORITE_DISHES = 300;
const DELETED_NAME = "حساب محذوف / Deleted account";

function formLocale(formData) {
  const locale = formData.get("locale");
  return routing.locales.includes(locale) ? locale : routing.defaultLocale;
}

const users = () => getDb().collection(USERS);

// Limits guessing with a stolen session. Wrong answers count, right ones don't.
async function checkPassword(userId, stored, password) {
  const key = `account:password:${userId}`;
  if (await isLimited(key, LIMITS.signInPair)) return "tooManyAttempts";
  if (!stored || !(await verifyPassword(password ?? "", stored))) {
    await hit(key, LIMITS.signInPair);
    return "wrongPassword";
  }
  return null;
}

export async function updateProfile(_previous, formData) {
  const values = { name: formData.get("name") ?? "", phone: formData.get("phone") ?? "" };
  const user = await getActionUser();
  if (!user) return { values, error: "signedOut" };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  await users().updateOne({ _id: new ObjectId(user.id) }, { $set: parsed.data });
  refresh();
  return { values: parsed.data, saved: Date.now() };
}

export async function changePassword(_previous, formData) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (user.demo) return { error: "demoBlocked" };
  const parsed = changePasswordSchema.safeParse({ current: formData.get("current") ?? "", next: formData.get("next") ?? "" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const _id = new ObjectId(user.id);
  const { passwordHash } = (await users().findOne({ _id }, { projection: { passwordHash: 1 } })) ?? {};
  const problem = await checkPassword(user.id, passwordHash, parsed.data.current);
  if (problem) return problem === "wrongPassword" ? { errors: { current: problem } } : { error: problem };

  await users().updateOne({ _id }, { $set: { passwordHash: await hashPassword(parsed.data.next) } });
  // Whoever was signed in elsewhere with the old password is signed out
  await deleteOtherSessions(_id);
  return { saved: Date.now() };
}

// A Google account has no password to check, so the link goes to the inbox instead
export async function sendSetPasswordLink(_previous, formData) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (user.demo) return { error: "demoBlocked" };
  const key = `reset:email:${user.email}`;
  if (await isLimited(key, LIMITS.resetEmail)) return { error: "tooManyAttempts" };
  await hit(key, LIMITS.resetEmail);
  const locale = formLocale(formData);
  after(() => sendPasswordReset({ _id: new ObjectId(user.id), email: user.email }, locale));
  return { sent: Date.now() };
}

// The new address has to prove itself first. The answer is the same whether or not it
// already belongs to someone, so this can't be used to find out who has an account.
export async function requestEmailChange(_previous, formData) {
  const values = { email: formData.get("email") ?? "" };
  const user = await getActionUser();
  if (!user) return { values, error: "signedOut" };
  if (user.demo) return { values, error: "demoBlocked" };
  const password = formData.get("password");
  const parsed = changeEmailSchema.safeParse({ ...values, ...(password !== null && { password }) });
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };
  if (parsed.data.email === user.email) return { values, errors: { email: "sameEmail" } };

  const _id = new ObjectId(user.id);
  const { passwordHash } = (await users().findOne({ _id }, { projection: { passwordHash: 1 } })) ?? {};
  if (passwordHash) {
    const problem = await checkPassword(user.id, passwordHash, parsed.data.password);
    if (problem) return problem === "wrongPassword" ? { values, errors: { password: problem } } : { values, error: problem };
  }

  const key = `email-change:user:${user.id}`;
  if (await isLimited(key, LIMITS.verifyResend)) return { values, error: "tooManyAttempts" };
  await hit(key, LIMITS.verifyResend);

  const newEmail = parsed.data.email;
  const locale = formLocale(formData);
  after(async () => {
    const taken = await users().findOne({ email: newEmail }, { projection: { _id: 1 } });
    if (taken) {
      await sendAccountExists(newEmail, locale);
      return;
    }
    const token = await issueEmailToken({ userId: _id, email: user.email, purpose: "changeEmail", newEmail });
    await sendEmailChange(newEmail, token, locale);
  });
  return { sent: newEmail };
}

// The button on the page the link opens. Pressing it is what makes the change.
export async function confirmEmailChange(_previous, formData) {
  const record = await consumeEmailToken(formData.get("token"), "changeEmail");
  if (!record?.newEmail) return { error: "linkInvalid" };

  try {
    // Only while the account still has the address the request was made from
    const { matchedCount } = await users().updateOne({ _id: record.userId, email: record.email }, { $set: { email: record.newEmail } });
    if (!matchedCount) return { error: "linkInvalid" };
  } catch (error) {
    // Someone took the address after the link was sent
    if (error.code === 11000) return { error: "linkInvalid" };
    throw error;
  }
  // Confirmations for coming bookings go to the new address
  await getDb().collection(BOOKINGS).updateMany({ userId: record.userId }, { $set: { email: record.newEmail } });

  const locale = formLocale(formData);
  after(() => sendEmailChangedNotice(record.email, record.newEmail, locale));
  const current = await getCurrentUser();
  if (current?.id !== record.userId.toString()) await createSession(record.userId);
  redirect({ href: { pathname: "/account/settings", query: { emailChanged: 1 } }, locale });
}

export async function signOutOtherDevices() {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  await deleteOtherSessions(new ObjectId(user.id));
  return { done: Date.now() };
}

// Permanent. Coming bookings are cancelled and their seats returned. Past ones stay in
// the restaurant's records with the person's details removed. An owner must first deal
// with their restaurants, which customers and bookings depend on.
export async function deleteAccount(_previous, formData) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (user.demo) return { error: "demoBlocked" };
  const _id = new ObjectId(user.id);
  const db = getDb();

  // Removing the last way in would lock the panel: the role comes off by script first
  if (user.role === "admin") return { error: "adminCantDelete" };
  if (await db.collection(RESTAURANTS).countDocuments({ ownerIds: _id, status: { $ne: "deleted" } })) return { error: "ownerCantDelete" };
  if (String(formData.get("email") ?? "").trim().toLowerCase() !== user.email) return { errors: { email: "emailMismatch" } };

  const { passwordHash } = (await users().findOne({ _id }, { projection: { passwordHash: 1 } })) ?? {};
  if (passwordHash) {
    const problem = await checkPassword(user.id, passwordHash, formData.get("password"));
    if (problem) return problem === "wrongPassword" ? { errors: { password: problem } } : { error: problem };
  }

  const bookings = db.collection(BOOKINGS);
  const coming = await bookings.find({ userId: _id, status: "confirmed", startsAt: { $gt: new Date() } }).toArray();
  for (const booking of coming) {
    // One request wins: seats are returned only by whoever actually cancelled it
    const { modifiedCount } = await bookings.updateOne({ _id: booking._id, status: "confirmed" }, { $set: { status: "cancelled", customerActionAt: new Date() } });
    if (!modifiedCount) continue;
    await releaseSeats(booking);
    const restaurant = await db.collection(RESTAURANTS).findOne({ _id: booking.restaurantId }, { projection: { name: 1, slug: 1, ownerIds: 1 } });
    if (restaurant) after(() => sendOwnerCancellationNotice(booking, restaurant));
  }
  await bookings.updateMany(
    { userId: _id },
    { $set: { userId: null, email: null, name: DELETED_NAME, phone: "", updatedAt: new Date() }, $unset: { note: "", cancelReason: "", proposal: "" } },
  );

  await db.collection(RESTAURANTS).updateMany({ ownerIds: _id }, { $pull: { ownerIds: _id } });
  await deleteSession();
  await Promise.all([db.collection("sessions").deleteMany({ userId: _id }), db.collection(EMAIL_TOKENS).deleteMany({ userId: _id })]);
  await users().deleteOne({ _id });
  redirect({ href: { pathname: "/", query: { accountDeleted: 1 } }, locale: formLocale(formData) });
}

// The heart on a dish. A dish's id is only unique within its restaurant, so a favorite
// is the pair, and the dish must really be on that restaurant's menu.
export async function setDishFavorite(slug, dishId, on) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success || !idSchema.safeParse(dishId).success || typeof on !== "boolean") return { error: "stale" };

  const restaurant = await getDb().collection(RESTAURANTS).findOne({ slug, ...(on && { "menu.items.id": dishId }) }, { projection: { _id: 1 } });
  if (!restaurant) return { error: "notFound" };
  const _id = new ObjectId(user.id);
  const favorite = { restaurantId: restaurant._id, dishId };
  if (on) {
    const { matchedCount } = await users().updateOne(
      { _id, [`favoriteDishes.${MAX_FAVORITE_DISHES - 1}`]: { $exists: false } },
      { $addToSet: { favoriteDishes: favorite } },
    );
    if (!matchedCount) return { error: "tooMany" };
  } else {
    await users().updateOne({ _id }, { $pull: { favoriteDishes: favorite } });
  }
  return { ok: true };
}

// The heart on a restaurant. Asks for the state it wants rather than flipping, so two
// quick taps or two tabs can't end up the opposite of what was shown.
export async function setFavorite(slug, on) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success || typeof on !== "boolean") return { error: "stale" };

  const restaurant = await getDb().collection(RESTAURANTS).findOne({ slug }, { projection: { _id: 1 } });
  if (!restaurant) return { error: "notFound" };
  const _id = new ObjectId(user.id);
  if (on) {
    const { matchedCount } = await users().updateOne(
      { _id, [`favoriteRestaurantIds.${MAX_FAVORITES - 1}`]: { $exists: false } },
      { $addToSet: { favoriteRestaurantIds: restaurant._id } },
    );
    if (!matchedCount) return { error: "tooMany" };
  } else {
    await users().updateOne({ _id }, { $pull: { favoriteRestaurantIds: restaurant._id } });
  }
  return { ok: true };
}
