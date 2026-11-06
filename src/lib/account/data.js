import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/db/client";
import { RESTAURANTS, USERS } from "@/db/config";
import { demoPhoto } from "@/data/dish-images";
import { getListedRestaurants, PUBLIC_RESTAURANT } from "@/lib/restaurants";

// What the account page shows. The hash itself never leaves this file: the page only
// needs to know whether there is one.
export async function getAccountDetails(userId) {
  const _id = new ObjectId(userId);
  const [user, ownedCount] = await Promise.all([
    getDb().collection(USERS).findOne({ _id }, { projection: { name: 1, email: 1, phone: 1, passwordHash: 1, googleId: 1 } }),
    getDb().collection(RESTAURANTS).countDocuments({ ownerIds: _id, status: { $ne: "deleted" } }),
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

// Saved dishes, grouped by restaurant. A dish that left the menu, or a restaurant no
// longer public, just doesn't appear; the saved entry can stay harmlessly.
export async function getFavoriteDishGroups(userId, locale) {
  const user = await getDb()
    .collection(USERS)
    .findOne({ _id: new ObjectId(userId) }, { projection: { favoriteDishes: 1 } });
  const saved = user?.favoriteDishes ?? [];
  if (saved.length === 0) return [];
  const restaurants = await getDb()
    .collection(RESTAURANTS)
    .find({ _id: { $in: saved.map((item) => item.restaurantId) }, ...PUBLIC_RESTAURANT }, { projection: { slug: 1, name: 1, menu: 1 } })
    .toArray();
  return restaurants
    .map(({ _id, slug, name, menu }) => {
      const wanted = new Set(saved.filter((item) => item.restaurantId.equals(_id)).map((item) => item.dishId));
      const dishes = menu
        .flatMap((category) => category.items)
        .filter((dish) => wanted.has(dish.id))
        .map((dish) => ({
          id: dish.id,
          name: dish.name[locale],
          price: dish.priceHalalas / 100,
          available: dish.available !== false,
          photo: dish.photo ?? null,
          image: dish.photo ? null : demoPhoto(slug, dish.id),
        }));
      return { slug, name: name[locale], dishes };
    })
    .filter((group) => group.dishes.length > 0);
}
