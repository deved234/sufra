import { getDb } from "@/db/client";
import { RESTAURANTS, USERS } from "@/db/config";
import { getSessionUserId } from "@/lib/auth/session";

// Who is visiting, for pages that are completely static and so can't read the session
// cookie while rendering, like a restaurant's booking page. Only ever answers about
// the caller's own account.
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const userId = await getSessionUserId();
  const user =
    userId && (await getDb().collection(USERS).findOne({ _id: userId }, { projection: { name: 1, email: 1, phone: 1, emailVerifiedAt: 1, favoriteRestaurantIds: 1 } }));
  if (!user) return Response.json({ user: null }, { headers });

  // Slugs, which is how pages refer to restaurants
  const favorites = user.favoriteRestaurantIds?.length
    ? await getDb().collection(RESTAURANTS).find({ _id: { $in: user.favoriteRestaurantIds } }, { projection: { slug: 1 } }).toArray()
    : [];

  return Response.json(
    { user: { name: user.name, email: user.email, phone: user.phone ?? "", verified: Boolean(user.emailVerifiedAt), favorites: favorites.map((restaurant) => restaurant.slug) } },
    { headers },
  );
}
