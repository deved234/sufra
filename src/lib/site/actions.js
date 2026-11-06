"use server";

import { ObjectId } from "mongodb";
import { updateTag } from "next/cache";
import { after } from "next/server";
import { getDb } from "@/db/client";
import { RESTAURANTS, SITE_DRAFTS, SITE_VERSIONS } from "@/db/config";
import { auditRestaurantEdit } from "@/lib/admin/log";
import { getActionUser } from "@/lib/auth/dal";
import { manageFilter } from "@/lib/dashboard/access";
import { getPhoto } from "@/lib/photos/cloudinary";
import { belongsTo } from "@/lib/photos/verify";
import { BLOCKS, SITE_LIMITS } from "@/lib/site/blocks";
import { deleteUnusedPhotos } from "@/lib/site/photos";
import { idSchema } from "@/lib/validation/menu";
import { draftBlocksSchema, publishBlocksSchema } from "@/lib/validation/site";

// An admin's editing counts once per sitting in the log, not once per autosave
const LOG_GAP_MS = 30 * 60 * 1000;

const SITE_ERRORS = new Set(["tooLong", "tooMany", "required", "photoInvalid", "siteInvalid", "siteNeedsMenu"]);

// Only our own messages have words to show. Anything else is a request the editor can't
// make itself, so a plain answer is enough.
const firstError = (zodError) => {
  const message = zodError.issues[0]?.message;
  return SITE_ERRORS.has(message) ? message : "siteInvalid";
};

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

async function ownedRestaurant(slug, projection) {
  const user = await getActionUser();
  if (!user) return { error: "signedOut" };
  if (!idSchema.safeParse(slug).success) return { error: "notFound" };
  const restaurant = await getDb().collection(RESTAURANTS).findOne(manageFilter(user, slug), { projection });
  return restaurant ? { user, restaurant } : { error: "notFound" };
}

// Writes the draft, if rev is still the stored version. If it has moved on, another tab
// saved in between, and the answer says so rather than writing over it. Answers with
// { conflict, blocks, rev }, { error }, or the new { rev, blocks }.
async function writeDraft(user, slug, restaurant, blocks, rev) {
  const drafts = getDb().collection(SITE_DRAFTS);
  const latest = async () => {
    const stored = await drafts.findOne({ restaurantId: restaurant._id }, { projection: { _id: 0, blocks: 1, rev: 1 } });
    return { conflict: true, blocks: stored.blocks, rev: stored.rev };
  };

  const current = await drafts.findOne({ restaurantId: restaurant._id }, { projection: { _id: 0, blocks: 1, rev: 1, updatedAt: 1 } });
  if ((current?.rev ?? 0) !== rev) return { conflict: true, blocks: current?.blocks ?? [], rev: current?.rev ?? 0 };

  let checked;
  try {
    const known = new Map([...storedPhotos(restaurant.site?.blocks), ...storedPhotos(current?.blocks)]);
    checked = await withCheckedPhotos(slug, blocks, known);
  } catch (error) {
    if (error.message !== "photoInvalid") console.error("[site] couldn't check a photo:", error);
    return { error: error.message === "photoInvalid" ? "photoInvalid" : "photoFailed" };
  }

  const now = new Date();
  const fields = { blocks: checked, updatedAt: now, updatedBy: new ObjectId(user.id) };
  if (current) {
    const { matchedCount } = await drafts.updateOne({ restaurantId: restaurant._id, rev }, { $set: fields, $inc: { rev: 1 } });
    if (!matchedCount) return latest();
  } else {
    try {
      await drafts.insertOne({ restaurantId: restaurant._id, ...fields, rev: 1 });
    } catch (error) {
      if (error.code !== 11000) throw error;
      return latest();
    }
  }

  if (!current || now - current.updatedAt > LOG_GAP_MS) await auditRestaurantEdit(user, slug, "siteEdited");
  return { rev: rev + 1, blocks: checked };
}

const validRev = (rev) => Number.isInteger(rev) && rev >= 0;

// Saves what the owner is working on. Visitors see none of it, so no public page changes
// and nothing here refreshes a cache.
export async function saveDraft(slug, blocks, rev) {
  const { user, restaurant, error } = await ownedRestaurant(slug, { "site.blocks": 1 });
  if (error) return { error };
  if (!validRev(rev)) return { error: "notFound" };

  const parsed = draftBlocksSchema.safeParse(blocks);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const written = await writeDraft(user, slug, restaurant, parsed.data, rev);
  return written.conflict || written.error ? written : { rev: written.rev };
}

// Which fields stop a page being published, in the order they appear on it. A field left
// out altogether has no language in its path: it's missing in both.
function missingFrom(zodError, blocks) {
  return zodError.issues.flatMap(({ path, message }) => {
    const [index, section, field, language] = path;
    if (section !== "props") return [];
    const { id: blockId, type } = blocks[index];
    return [{ blockId, type, field, language: language ?? null, message }];
  });
}

// Makes the page visitors see the one being edited. The draft is saved along with it, so
// what's published is always a draft that exists. Each publish is also kept as a version
// to go back to, and the oldest beyond the limit goes.
export async function publishSite(slug, blocks, rev) {
  const { user, restaurant, error } = await ownedRestaurant(slug, { site: 1, status: 1 });
  if (error) return { error };
  if (!validRev(rev)) return { error: "notFound" };

  const parsed = draftBlocksSchema.safeParse(blocks);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const strict = publishBlocksSchema.safeParse(blocks);
  if (!strict.success) {
    const missing = missingFrom(strict.error, parsed.data);
    return missing.length ? { missing } : { error: firstError(strict.error) };
  }

  const written = await writeDraft(user, slug, restaurant, strict.data, rev);
  if (written.conflict || written.error) return written;

  const db = getDb();
  const versions = db.collection(SITE_VERSIONS);
  try {
    const [newest] = await versions.find({ restaurantId: restaurant._id }, { projection: { version: 1 } }).sort({ version: -1 }).limit(1).toArray();
    const version = Math.max(restaurant.site?.version ?? 0, newest?.version ?? 0) + 1;
    const publishedAt = new Date();

    await versions.insertOne({ restaurantId: restaurant._id, version, blocks: written.blocks, publishedAt, publishedBy: new ObjectId(user.id) });
    await db.collection(RESTAURANTS).updateOne({ _id: restaurant._id }, { $set: { site: { blocks: written.blocks, version, publishedAt } } });
    await versions.deleteMany({ restaurantId: restaurant._id, version: { $lte: version - SITE_LIMITS.versions } });
    await auditRestaurantEdit(user, slug, "sitePublished", `v${version}`);

    updateTag(`restaurant:${slug}`);
    updateTag("restaurants");
    after(() => deleteUnusedPhotos(slug, restaurant._id));

    return { rev: written.rev, version, publishedAt: publishedAt.toISOString(), status: restaurant.status ?? "published" };
  } catch (failure) {
    // The draft did save, so the editor's rev must still move on. The usual cause is two
    // publishes picking the same version number, which the unique index refuses.
    if (failure.code !== 11000) console.error("[site] couldn't publish:", failure);
    return { error: "saveFailed", rev: written.rev };
  }
}

// One kept version's blocks, for the editor to load as its working copy
export async function loadSiteVersion(slug, version) {
  const { restaurant, error } = await ownedRestaurant(slug, { _id: 1 });
  if (error) return { error };
  if (!Number.isInteger(version)) return { error: "notFound" };
  const stored = await getDb().collection(SITE_VERSIONS).findOne({ restaurantId: restaurant._id, version }, { projection: { _id: 0, blocks: 1 } });
  return stored ? { blocks: stored.blocks } : { error: "notFound" };
}
