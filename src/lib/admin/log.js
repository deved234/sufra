import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { ADMIN_LOG, RESTAURANTS } from "@/db/config";

// The record of what admins did. This is the only code that writes it, and nothing in
// the site changes or removes an entry.
export async function logAdminAction(admin, { action, targetType, targetId, targetLabel, detail }) {
  await getDb()
    .collection(ADMIN_LOG)
    .insertOne({
      actorId: new ObjectId(admin.id),
      actorEmail: admin.email,
      action,
      targetType,
      targetId: String(targetId),
      targetLabel: String(targetLabel),
      ...(detail && { detail: String(detail).slice(0, 300) }),
      at: new Date(),
    });
}

// For the owner's dashboard actions: recorded only when an admin changes a restaurant
// that isn't theirs.
export async function auditRestaurantEdit(user, slug, action, detail) {
  if (user.role !== "admin") return;
  const restaurant = await getDb().collection(RESTAURANTS).findOne({ slug }, { projection: { ownerIds: 1 } });
  if (restaurant?.ownerIds?.some((id) => id.toString() === user.id)) return;
  await logAdminAction(user, { action, targetType: "restaurant", targetId: slug, targetLabel: slug, detail });
}
