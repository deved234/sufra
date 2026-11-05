"use server";

import { ObjectId } from "mongodb";
import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { getDb } from "@/db/client";
import { RESTAURANTS, USERS } from "@/db/config";
import { logAdminAction } from "@/lib/admin/log";
import { getAdminUser } from "@/lib/auth/dal";
import {
  sendAccountRestored,
  sendAccountSuspended,
  sendOwnershipTransferred,
  sendPasswordReset,
  sendRestaurantRestored,
  sendRestaurantSuspended,
} from "@/lib/auth/emails";
import { deleteUserSessions } from "@/lib/auth/session";
import { email as emailSchema } from "@/lib/validation/auth";
import { idSchema } from "@/lib/validation/menu";

// Each action checks for an admin itself and records what it did. The role comes from
// the database on every request, so removing it takes effect at once.

const restaurants = () => getDb().collection(RESTAURANTS);
const users = () => getDb().collection(USERS);
const isObjectId = (value) => typeof value === "string" && /^[0-9a-f]{24}$/.test(value);

function readReason(formData) {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { errors: { reason: "required" } };
  if (reason.length > 200) return { errors: { reason: "tooLong" } };
  return { reason };
}

function refreshRestaurant(slug) {
  updateTag(`restaurant:${slug}`);
  updateTag("restaurants");
  refresh();
}

export async function suspendRestaurant(slug, _previous, formData) {
  const admin = await getAdminUser();
  if (!admin) return { error: "notFound" };
  if (!idSchema.safeParse(slug).success) return { error: "notFound" };
  const { reason, errors } = readReason(formData);
  if (errors) return { errors };

  // The status it had, so lifting this puts it back as it was
  const restaurant = await restaurants().findOne({ slug, status: { $nin: ["suspended", "deleted"] } }, { projection: { name: 1, slug: 1, status: 1, ownerIds: 1 } });
  if (!restaurant) return { error: "stale" };
  await restaurants().updateOne(
    { _id: restaurant._id },
    { $set: { status: "suspended", statusBeforeSuspension: restaurant.status ?? "published", suspendedReason: reason }, $unset: { suspendedByAccount: "" } },
  );
  await logAdminAction(admin, { action: "restaurantSuspended", targetType: "restaurant", targetId: slug, targetLabel: restaurant.name.en, detail: reason });
  after(() => sendRestaurantSuspended(restaurant, reason));
  refreshRestaurant(slug);
  return { done: Date.now() };
}

export async function unsuspendRestaurant(slug) {
  const admin = await getAdminUser();
  if (!admin) return { error: "notFound" };
  if (!idSchema.safeParse(slug).success) return { error: "notFound" };
  const restaurant = await restaurants().findOne({ slug, status: "suspended" }, { projection: { name: 1, slug: 1, ownerIds: 1, statusBeforeSuspension: 1 } });
  if (!restaurant) return { error: "stale" };
  await restaurants().updateOne(
    { _id: restaurant._id },
    { $set: { status: restaurant.statusBeforeSuspension ?? "published" }, $unset: { statusBeforeSuspension: "", suspendedReason: "", suspendedByAccount: "" } },
  );
  await logAdminAction(admin, { action: "restaurantRestored", targetType: "restaurant", targetId: slug, targetLabel: restaurant.name.en });
  after(() => sendRestaurantRestored(restaurant));
  refreshRestaurant(slug);
  return { done: Date.now() };
}

// Comes back hidden, so its owner decides when people see it again. The bookings
// cancelled when it was deleted stay cancelled.
export async function restoreRestaurant(slug) {
  const admin = await getAdminUser();
  if (!admin) return { error: "notFound" };
  if (!idSchema.safeParse(slug).success) return { error: "notFound" };
  const restaurant = await restaurants().findOneAndUpdate({ slug, status: "deleted" }, { $set: { status: "hidden" }, $unset: { deletedAt: "" } }, { projection: { name: 1 } });
  if (!restaurant) return { error: "stale" };
  await logAdminAction(admin, { action: "restaurantUndeleted", targetType: "restaurant", targetId: slug, targetLabel: restaurant.name.en });
  refreshRestaurant(slug);
  return { done: Date.now() };
}

export async function transferOwnership(slug, _previous, formData) {
  const values = { email: formData.get("email") ?? "" };
  const admin = await getAdminUser();
  if (!admin) return { values, error: "notFound" };
  if (!idSchema.safeParse(slug).success) return { values, error: "notFound" };
  const parsed = emailSchema.safeParse(values.email);
  if (!parsed.success) return { values, errors: { email: "emailInvalid" } };

  const owner = await users().findOne({ email: parsed.data }, { projection: { email: 1, name: 1, emailVerifiedAt: 1, suspendedAt: 1 } });
  if (!owner?.emailVerifiedAt || owner.suspendedAt) return { values, errors: { email: "ownerNotEligible" } };
  const restaurant = await restaurants().findOneAndUpdate({ slug, status: { $ne: "deleted" } }, { $set: { ownerIds: [owner._id] } }, { projection: { name: 1, slug: 1 } });
  if (!restaurant) return { values, error: "stale" };

  await logAdminAction(admin, { action: "ownershipTransferred", targetType: "restaurant", targetId: slug, targetLabel: restaurant.name.en, detail: owner.email });
  after(() => sendOwnershipTransferred(owner, restaurant));
  refresh();
  return { done: Date.now() };
}

// Another admin's account is out of reach here, and so is one's own: nobody gets locked
// out from the panel. The role itself is only changed by the make-admin script.
async function reachableUser(admin, id, projection = {}) {
  if (!isObjectId(id)) return { error: "notFound" };
  const user = await users().findOne({ _id: new ObjectId(id) }, { projection: { email: 1, name: 1, role: 1, ...projection } });
  if (!user) return { error: "notFound" };
  if (user.role === "admin") return { error: "cantActOnAdmin" };
  return { user };
}

// The account's restaurants stop with it, marked, so lifting this restores only those
export async function suspendUser(id, _previous, formData) {
  const admin = await getAdminUser();
  if (!admin) return { error: "notFound" };
  const { reason, errors } = readReason(formData);
  if (errors) return { errors };
  const { user, error } = await reachableUser(admin, id);
  if (error) return { error };

  await users().updateOne({ _id: user._id }, { $set: { suspendedAt: new Date(), suspendedReason: reason } });
  await deleteUserSessions(user._id);
  const owned = await restaurants().find({ ownerIds: user._id, status: { $nin: ["suspended", "deleted"] } }, { projection: { slug: 1, status: 1 } }).toArray();
  for (const restaurant of owned) {
    await restaurants().updateOne(
      { _id: restaurant._id },
      { $set: { status: "suspended", statusBeforeSuspension: restaurant.status ?? "published", suspendedReason: reason, suspendedByAccount: true } },
    );
    updateTag(`restaurant:${restaurant.slug}`);
  }
  updateTag("restaurants");
  await logAdminAction(admin, { action: "userSuspended", targetType: "user", targetId: id, targetLabel: user.email, detail: reason });
  after(() => sendAccountSuspended(user, reason));
  refresh();
  return { done: Date.now() };
}

export async function unsuspendUser(id) {
  const admin = await getAdminUser();
  if (!admin) return { error: "notFound" };
  const { user, error } = await reachableUser(admin, id);
  if (error) return { error };

  await users().updateOne({ _id: user._id }, { $unset: { suspendedAt: "", suspendedReason: "" } });
  const stopped = await restaurants().find({ ownerIds: user._id, status: "suspended", suspendedByAccount: true }, { projection: { slug: 1, statusBeforeSuspension: 1 } }).toArray();
  for (const restaurant of stopped) {
    await restaurants().updateOne(
      { _id: restaurant._id },
      { $set: { status: restaurant.statusBeforeSuspension ?? "published" }, $unset: { statusBeforeSuspension: "", suspendedReason: "", suspendedByAccount: "" } },
    );
    updateTag(`restaurant:${restaurant.slug}`);
  }
  updateTag("restaurants");
  await logAdminAction(admin, { action: "userRestored", targetType: "user", targetId: id, targetLabel: user.email });
  after(() => sendAccountRestored(user));
  refresh();
  return { done: Date.now() };
}

export async function confirmUserEmail(id) {
  const admin = await getAdminUser();
  if (!admin) return { error: "notFound" };
  const { user, error } = await reachableUser(admin, id);
  if (error) return { error };
  await users().updateOne({ _id: user._id }, [{ $set: { emailVerifiedAt: { $ifNull: ["$emailVerifiedAt", "$$NOW"] } } }]);
  await logAdminAction(admin, { action: "emailConfirmed", targetType: "user", targetId: id, targetLabel: user.email });
  refresh();
  return { done: Date.now() };
}

export async function sendUserPasswordLink(id) {
  const admin = await getAdminUser();
  if (!admin) return { error: "notFound" };
  const { user, error } = await reachableUser(admin, id);
  if (error) return { error };
  await logAdminAction(admin, { action: "passwordLinkSent", targetType: "user", targetId: id, targetLabel: user.email });
  after(() => sendPasswordReset(user, "ar"));
  return { done: Date.now() };
}

export async function endUserSessions(id) {
  const admin = await getAdminUser();
  if (!admin) return { error: "notFound" };
  const { user, error } = await reachableUser(admin, id);
  if (error) return { error };
  await deleteUserSessions(user._id);
  await logAdminAction(admin, { action: "sessionsEnded", targetType: "user", targetId: id, targetLabel: user.email });
  return { done: Date.now() };
}
