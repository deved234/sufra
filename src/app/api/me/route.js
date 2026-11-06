import { getDb } from "@/db/client";
import { RESTAURANTS, USERS } from "@/db/config";
import { ownsRestaurant } from "@/lib/auth/home-path";
import { getSessionUserId } from "@/lib/auth/session";

// Who is visiting, for pages that are completely static and so can't read the session
// cookie while rendering, like a restaurant's booking page. Only ever answers about
// the caller's own account.
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const userId = await getSessionUserId();
  const user =
    userId && (await getDb().collection(USERS).findOne({ _id: userId }, { projection: { name: 1, email: 1, phone: 1, emailVerifiedAt: 1, favoriteRestaurantIds: 1, favoriteDishes: 1, role: 1, suspendedAt: 1, demoExpiresAt: 1 } }));
  if (!user || user.suspendedAt || user.demoExpiresAt <= new Date()) return Response.json({ user: null }, { headers });

  // Slugs, which is how pages refer to restaurants
  const dishes = user.favoriteDishes ?? [];
  const ids = [...(user.favoriteRestaurantIds ?? []), ...dishes.map((item) => item.restaurantId)];
  const restaurants = ids.length ? await getDb().collection(RESTAURANTS).find({ _id: { $in: ids } }, { projection: { slug: 1 } }).toArray() : [];
  const slugOf = (id) => restaurants.find((restaurant) => restaurant._id.equals(id))?.slug;

  return Response.json(
    { user: { name: user.name, email: user.email, phone: user.phone ?? "", verified: Boolean(user.emailVerifiedAt), isAdmin: user.role === "admin", isDemo: Boolean(user.demoExpiresAt), isOwner: await ownsRestaurant(user._id.toString()), favorites: (user.favoriteRestaurantIds ?? []).map(slugOf).filter(Boolean), favoriteDishes: dishes.map(({ restaurantId, dishId }) => `${slugOf(restaurantId)}/${dishId}`) } },
    { headers },
  );
}
