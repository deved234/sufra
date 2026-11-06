"use server";

import { randomBytes } from "node:crypto";
import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { getDb } from "@/db/client";
import { RESTAURANTS } from "@/db/config";
import { auditRestaurantEdit } from "@/lib/admin/log";
import { getActionUser } from "@/lib/auth/dal";
import { hit, isLimited, LIMITS } from "@/lib/auth/rate-limit";
import { manageFilter } from "@/lib/dashboard/access";
import { deletePhotos, photosEnabled, signUpload } from "@/lib/photos/cloudinary";
import { photoFolder, verifyPhoto } from "@/lib/photos/verify";
import { idSchema } from "@/lib/validation/menu";

// Permission to send one photo to Cloudinary. The file goes straight there from the
// browser and never passes through this server, but only with this signature.
export async function requestPhotoUpload(slug) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  // Uploads use up the Cloudinary allowance, which real owners depend on
  if (user.demo) return { error: "demoBlocked" };
  if (!idSchema.safeParse(slug).success) return { error: "notFound" };
  if (!photosEnabled) return { error: "photoFailed" };

  const owned = await getDb().collection(RESTAURANTS).findOne(manageFilter(user, slug), { projection: { _id: 1 } });
  if (!owned) return { error: "notFound" };

  const key = `photo:user:${user.id}`;
  if (await isLimited(key, LIMITS.photoUpload)) return { error: "tooManyAttempts" };
  await hit(key, LIMITS.photoUpload);

  return signUpload(`${photoFolder(slug)}/${randomBytes(12).toString("hex")}`);
}

// A restaurant's cover or logo. raw is empty to remove it. Saved as soon as it's chosen.
export async function saveRestaurantPhoto(slug, kind, raw) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (user.demo) return { error: "demoBlocked" };
  if (!idSchema.safeParse(slug).success || !["cover", "logo"].includes(kind)) return { error: "notFound" };

  const { photo, error } = await verifyPhoto(slug, raw);
  if (error) return { error };

  const before = await getDb()
    .collection(RESTAURANTS)
    .findOneAndUpdate(manageFilter(user, slug), photo ? { $set: { [kind]: photo } } : { $unset: { [kind]: "" } }, { projection: { [kind]: 1 } });
  if (!before) return { error: "notFound" };
  await auditRestaurantEdit(user, slug, kind === "cover" ? "coverChanged" : "logoChanged");

  const old = before[kind]?.id;
  if (old && old !== photo?.id) after(() => deletePhotos([old]));

  updateTag(`restaurant:${slug}`);
  updateTag("restaurants");
  refresh();
  return { ok: true };
}
