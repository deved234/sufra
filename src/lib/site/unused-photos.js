// Newly uploaded photos may not be saved anywhere yet: someone can still be working with
// one in a form or an unsaved draft. So nothing younger than this counts as unused.
export const PHOTO_GRACE_MS = 24 * 60 * 60 * 1000;

// Which stored photos nothing uses any more
export function unusedPhotos(stored, used, now = Date.now()) {
  return stored.filter(({ id, createdAt }) => !used.has(id) && now - new Date(createdAt).getTime() > PHOTO_GRACE_MS).map(({ id }) => id);
}
