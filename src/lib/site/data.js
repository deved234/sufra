import "server-only";
import { getDb } from "@/db/client";
import { RESTAURANTS, SITE_DRAFTS, SITE_VERSIONS } from "@/db/config";
import { manageFilter } from "@/lib/dashboard/access";
import { siteBlocks } from "@/lib/site/blocks";

// What the editor opens with: the draft if there is one, otherwise the page visitors see.
// rev 0 means nothing has been saved yet. Null if this isn't the user's restaurant.
// published is null when the page visitors see is the same as the draft, so the editor
// has one list to compare by reference instead of two equal copies.
export async function getSiteDraft(slug, user) {
  const db = getDb();
  const restaurant = await db.collection(RESTAURANTS).findOne(manageFilter(user, slug), { projection: { "site.blocks": 1, "site.version": 1 } });
  if (!restaurant) return null;
  const [draft, versions] = await Promise.all([
    db.collection(SITE_DRAFTS).findOne({ restaurantId: restaurant._id }, { projection: { _id: 0, blocks: 1, rev: 1 } }),
    db.collection(SITE_VERSIONS).find({ restaurantId: restaurant._id }, { projection: { _id: 0, version: 1, publishedAt: 1 } }).sort({ version: -1 }).toArray(),
  ]);
  const published = siteBlocks(restaurant);
  const blocks = draft?.blocks ?? published;
  return {
    blocks,
    rev: draft?.rev ?? 0,
    published: JSON.stringify(blocks) === JSON.stringify(published) ? null : published,
    version: restaurant.site?.version ?? null,
    versions: versions.map(({ version, publishedAt }) => ({ version, publishedAt: publishedAt.toISOString() })),
  };
}
