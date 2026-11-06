"use server";

import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { RESTAURANTS, SITE_DRAFTS } from "@/db/config";
import { auditRestaurantEdit } from "@/lib/admin/log";
import { getActionUser } from "@/lib/auth/dal";
import { manageFilter } from "@/lib/dashboard/access";
import { getPhoto } from "@/lib/photos/cloudinary";
import { belongsTo } from "@/lib/photos/verify";
import { BLOCKS } from "@/lib/site/blocks";
import { idSchema } from "@/lib/validation/menu";
import { draftBlocksSchema } from "@/lib/validation/site";

// An admin's editing counts once per sitting in the log, not once per autosave
const LOG_GAP_MS = 30 * 60 * 1000;

const SITE_ERRORS = new Set(["tooLong", "tooMany", "required", "photoInvalid", "siteInvalid", "siteNeedsMenu"]);

const storedPhotos = (blocks) => {
  const known = new Map();
  for (const block of blocks ?? []) {
    for (const [name, field] of Object.entries(BLOCKS[block.type].fields)) {
      if (field.type === "photo" && block.props[name]) known.set(block.props[name].id, block.props[name]);
      if (field.type === "photos") for (const photo of block.props[name] ?? []) known.set(photo.id, photo);
    }
  }
  return known;
};

// The browser only reports a photo's id and preview. Each must be in this restaurant's
// folder, and a new one must really be on Cloudinary, which also gives its size. A photo
// already saved isn't asked about again, so autosaving costs no requests.
async function withCheckedPhotos(slug, blocks, known) {
  const check = async (photo) => {
    if (!belongsTo(photo.id, slug)) throw new Error("photoInvalid");
    const saved = known.get(photo.id);
    if (saved?.width) return { ...photo, width: saved.width, height: saved.height };
    const size = await getPhoto(photo.id);
    if (!size) throw new Error("photoInvalid");
    return { ...photo, ...size };
  };
  return Promise.all(
    blocks.map(async (block) => {
      const props = { ...block.props };
      for (const [name, field] of Object.entries(BLOCKS[block.type].fields)) {
        if (field.type === "photo" && props[name]) props[name] = await check(props[name]);
        if (field.type === "photos" && props[name]) props[name] = await Promise.all(props[name].map(check));
      }
      return { ...block, props };
    }),
  );
}

// Saves what the owner is working on. Visitors see none of it, so no public page changes
// and nothing here refreshes a cache. rev is the version this edit started from: if the
// stored one has moved on, another tab saved in between, and the answer says so rather
// than writing over it.
export async function saveDraft(slug, blocks, rev) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success || !Number.isInteger(rev) || rev < 0) return { error: "notFound" };

  const parsed = draftBlocksSchema.safeParse(blocks);
  if (!parsed.success) {
    // Only our own messages have words to show. Anything else is a request the editor
    // can't make itself, so a plain answer is enough.
    const message = parsed.error.issues[0]?.message;
    return { error: SITE_ERRORS.has(message) ? message : "siteInvalid" };
  }

  const db = getDb();
  const restaurant = await db.collection(RESTAURANTS).findOne(manageFilter(user, slug), { projection: { "site.blocks": 1 } });
  if (!restaurant) return { error: "notFound" };

  const drafts = db.collection(SITE_DRAFTS);
  const current = await drafts.findOne({ restaurantId: restaurant._id }, { projection: { _id: 0, blocks: 1, rev: 1, updatedAt: 1, updatedBy: 1 } });
  if ((current?.rev ?? 0) !== rev) return { conflict: true, blocks: current?.blocks ?? [], rev: current?.rev ?? 0 };

  let checked;
  try {
    const known = new Map([...storedPhotos(restaurant.site?.blocks), ...storedPhotos(current?.blocks)]);
    checked = await withCheckedPhotos(slug, parsed.data, known);
  } catch (error) {
    if (error.message !== "photoInvalid") console.error("[site] couldn't check a photo:", error);
    return { error: error.message === "photoInvalid" ? "photoInvalid" : "photoFailed" };
  }

  const now = new Date();
  const fields = { blocks: checked, updatedAt: now, updatedBy: new ObjectId(user.id) };
  if (current) {
    const { matchedCount } = await drafts.updateOne({ restaurantId: restaurant._id, rev }, { $set: fields, $inc: { rev: 1 } });
    if (!matchedCount) {
      const latest = await drafts.findOne({ restaurantId: restaurant._id }, { projection: { _id: 0, blocks: 1, rev: 1 } });
      return { conflict: true, blocks: latest.blocks, rev: latest.rev };
    }
  } else {
    try {
      await drafts.insertOne({ restaurantId: restaurant._id, ...fields, rev: 1 });
    } catch (error) {
      if (error.code !== 11000) throw error;
      const latest = await drafts.findOne({ restaurantId: restaurant._id }, { projection: { _id: 0, blocks: 1, rev: 1 } });
      return { conflict: true, blocks: latest.blocks, rev: latest.rev };
    }
  }

  if (!current || now - current.updatedAt > LOG_GAP_MS) await auditRestaurantEdit(user, slug, "siteEdited");
  return { rev: rev + 1 };
}
