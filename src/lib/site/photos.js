import "server-only";
import { getDb } from "@/db/client";
import { RESTAURANTS, SITE_DRAFTS, SITE_VERSIONS } from "@/db/config";
import { deletePhotos, listPhotos, photosEnabled } from "@/lib/photos/cloudinary";
import { photoFolder, photoIds } from "@/lib/photos/verify";
import { blockPhotoIds } from "@/lib/site/ops";
import { unusedPhotos } from "@/lib/site/unused-photos";

// Removes this restaurant's photos that nothing uses: not its cover or logo, not a dish,
// not the published page, the draft, or any kept version. A block's photo can sit in any
// of those, so it can only be judged by looking at all of them. Runs after a publish, and
// a failure just leaves files for the next one.
export async function deleteUnusedPhotos(slug, restaurantId) {
  if (!photosEnabled) return;
  try {
    const db = getDb();
    const [restaurant, draft, versions] = await Promise.all([
      db.collection(RESTAURANTS).findOne({ _id: restaurantId }, { projection: { cover: 1, logo: 1, menu: 1, "site.blocks": 1 } }),
      db.collection(SITE_DRAFTS).findOne({ restaurantId }, { projection: { blocks: 1 } }),
      db.collection(SITE_VERSIONS).find({ restaurantId }, { projection: { blocks: 1 } }).toArray(),
    ]);
    if (!restaurant) return;

    const used = new Set([
      ...[restaurant.cover, restaurant.logo].flatMap((photo) => (photo ? [photo.id] : [])),
      ...photoIds(restaurant.menu ?? []),
      ...blockPhotoIds(restaurant.site?.blocks ?? []),
      ...blockPhotoIds(draft?.blocks ?? []),
      ...versions.flatMap(({ blocks }) => blockPhotoIds(blocks)),
    ]);

    const unused = unusedPhotos(await listPhotos(`${photoFolder(slug)}/`), used);
    if (unused.length) await deletePhotos(unused);
  } catch (error) {
    console.error("[site] couldn't clear unused photos:", error);
  }
}
