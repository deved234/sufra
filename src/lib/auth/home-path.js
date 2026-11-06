import "server-only";
import { cache } from "react";
import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { RESTAURANTS } from "@/db/config";

// An owner is whoever is in a restaurant's ownerIds, not a role on the account
export const ownsRestaurant = cache(async (userId) => {
  const restaurant = await getDb()
    .collection(RESTAURANTS)
    .findOne({ ownerIds: new ObjectId(userId), status: { $ne: "deleted" } }, { projection: { _id: 1 } });
  return Boolean(restaurant);
});

// Where an account goes after signing in, when nothing else asked for a page.
// asOwner: they came through the restaurant owners' entrance, so an account with no
// restaurant yet is here to create one.
export async function homeFor(user, { asOwner = false } = {}) {
  if (user.role === "admin") return "/admin";
  if (await ownsRestaurant(user.id)) return "/dashboard";
  return asOwner ? "/dashboard/new" : "/explore";
}
