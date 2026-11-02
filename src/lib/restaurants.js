import { cacheLife } from "next/cache";
import { restaurants } from "@/data/restaurants";

// The only place that knows where restaurant data comes from.
// Pages call these functions; swapping the mock file for a database changes nothing else.

export async function getRestaurants() {
  "use cache";
  cacheLife("hours");
  return restaurants;
}

export async function getRestaurantBySlug(slug) {
  "use cache";
  cacheLife("hours");
  return restaurants.find((restaurant) => restaurant.slug === slug) ?? null;
}
