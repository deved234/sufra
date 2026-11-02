import { cacheLife, cacheTag } from "next/cache";
import { locale as localeParam } from "next/root-params";
import { getDb } from "@/db/client";
import { RESTAURANTS } from "@/db/config";
import { dishImages } from "@/data/dish-images";

// The only place that knows where restaurant data comes from (MongoDB Atlas).
// Pages call these functions; they never see the database or its document shape.
// Results are cached and read at build time, so restaurant pages stay static.
// Reading the locale root param inside "use cache" adds it to the cache key, so
// each language is cached apart. Tags let a future dashboard refresh one restaurant.

// _id is an ObjectId, which can't be passed to Client Components; pages use the slug
const withoutId = { projection: { _id: 0 } };

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
      items: category.items.map(({ priceHalalas, ...item }) => ({
        ...item,
        name: pick(item.name),
        description: pick(item.description),
        price: priceHalalas / 100,
        // A dish id also names its photo
        image: dishImages[item.id] ?? null,
      })),
    })),
  };
}

export async function getRestaurants() {
  "use cache";
  cacheLife("hours");
  cacheTag("restaurants");
  const locale = await localeParam();
  const restaurants = await getDb().collection(RESTAURANTS).find({}, withoutId).sort({ slug: 1 }).toArray();
  return restaurants.map((restaurant) => localize(restaurant, locale));
}

export async function getRestaurantBySlug(slug) {
  "use cache";
  cacheLife("hours");
  cacheTag(`restaurant:${slug}`);
  const locale = await localeParam();
  const restaurant = await getDb().collection(RESTAURANTS).findOne({ slug }, withoutId);
  return restaurant ? localize(restaurant, locale) : null;
}

// One dish with its restaurant and category, for the dish page and modal
export async function getDish(slug, dishId) {
  "use cache";
  cacheLife("hours");
  cacheTag(`restaurant:${slug}`);
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
  cacheTag("restaurants");
  const restaurants = await getDb()
    .collection(RESTAURANTS)
    .find({}, { projection: { _id: 0, slug: 1, "menu.items.id": 1 } })
    .toArray();
  return restaurants.flatMap((restaurant) =>
    restaurant.menu.flatMap((category) => category.items.map((item) => ({ slug: restaurant.slug, dishId: item.id }))),
  );
}
