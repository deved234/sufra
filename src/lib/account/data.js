import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { RESTAURANTS, USERS } from "@/db/config";
import { getListedRestaurants } from "@/lib/restaurants";

// What the account page shows. The hash itself never leaves this file: the page only
// needs to know whether there is one.
export async function getAccountDetails(userId) {
  const _id = new ObjectId(userId);
  const [user, ownedCount] = await Promise.all([
    getDb().collection(USERS).findOne({ _id }, { projection: { name: 1, email: 1, phone: 1, passwordHash: 1, googleId: 1 } }),
    getDb().collection(RESTAURANTS).countDocuments({ ownerIds: _id }),
  ]);
  return user && { name: user.name, email: user.email, phone: user.phone ?? "", hasPassword: Boolean(user.passwordHash), googleLinked: Boolean(user.googleId), ownedCount };
}

export async function getFavoriteCards(userId) {
  const user = await getDb()
    .collection(USERS)
    .findOne({ _id: new ObjectId(userId) }, { projection: { favoriteRestaurantIds: 1 } });
  const restaurants = await getDb()
    .collection(RESTAURANTS)
    .find({ _id: { $in: user?.favoriteRestaurantIds ?? [] } }, { projection: { slug: 1 } })
    .toArray();
  const slugs = new Set(restaurants.map((restaurant) => restaurant.slug));
  // The same cards as the public lists, so only restaurants that are listed show
  return (await getListedRestaurants()).filter((card) => slugs.has(card.slug));
}
