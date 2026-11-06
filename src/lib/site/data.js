import "server-only";
import { getDb } from "@/db/client";
import { RESTAURANTS, SITE_DRAFTS } from "@/db/config";
import { manageFilter } from "@/lib/dashboard/access";
import { siteBlocks } from "@/lib/site/blocks";

// What the editor opens with: the draft if there is one, otherwise the page visitors see.
// rev 0 means nothing has been saved yet. Null if this isn't the user's restaurant.
export async function getSiteDraft(slug, user) {
  const db = getDb();
  const restaurant = await db.collection(RESTAURANTS).findOne(manageFilter(user, slug), { projection: { "site.blocks": 1, "site.version": 1 } });
  if (!restaurant) return null;
  const draft = await db.collection(SITE_DRAFTS).findOne({ restaurantId: restaurant._id }, { projection: { _id: 0, blocks: 1, rev: 1 } });
  return { blocks: draft?.blocks ?? siteBlocks(restaurant), rev: draft?.rev ?? 0 };
}
