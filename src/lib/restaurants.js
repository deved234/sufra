import { cacheLife } from "next/cache";
import { locale as localeParam } from "next/root-params";
import { restaurants } from "@/data/restaurants";

// The only place that knows where restaurant data comes from.
// Pages call these functions; swapping the mock file for a database changes nothing else.
// They return text in the page's language only. Reading the locale root param
// inside "use cache" adds it to the cache key, so each language is cached apart.

function localize(restaurant, locale) {
  const pick = (text) => text[locale];
  return {
    ...restaurant,
    name: pick(restaurant.name),
    tagline: pick(restaurant.tagline),
    cuisine: pick(restaurant.cuisine),
    city: pick(restaurant.city),
    address: pick(restaurant.address),
    hours: pick(restaurant.hours),
    menu: restaurant.menu.map((category) => ({
      ...category,
      name: pick(category.name),
      items: category.items.map((item) => ({ ...item, name: pick(item.name), description: pick(item.description) })),
    })),
  };
}

export async function getRestaurants() {
  "use cache";
  cacheLife("hours");
  const locale = await localeParam();
  return restaurants.map((restaurant) => localize(restaurant, locale));
}

export async function getRestaurantBySlug(slug) {
  "use cache";
  cacheLife("hours");
  const locale = await localeParam();
  const restaurant = restaurants.find((r) => r.slug === slug);
  return restaurant ? localize(restaurant, locale) : null;
}

// One dish with its restaurant and category, for the dish page and modal
export async function getDish(slug, dishId) {
  "use cache";
  cacheLife("hours");
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return null;
  for (const category of restaurant.menu) {
    const dish = category.items.find((item) => item.id === dishId);
    if (dish) return { restaurant, category, dish };
  }
  return null;
}

// Every { slug, dishId } pair, so each dish page is prerendered
export async function getDishParams() {
  "use cache";
  cacheLife("hours");
  return restaurants.flatMap((restaurant) =>
    restaurant.menu.flatMap((category) => category.items.map((item) => ({ slug: restaurant.slug, dishId: item.id }))),
  );
}
