import { cacheLife, cacheTag } from "next/cache";
import { locale as localeParam } from "next/root-params";
import { getDb } from "@/db/client";
import { RESTAURANTS } from "@/db/config";
import { demoPhoto } from "@/data/dish-images";
import { idSchema } from "@/lib/validation/menu";

// The only place that knows where restaurant data comes from (MongoDB Atlas).
// Pages call these functions; they never see the database or its document shape.
// Results are cached and read at build time, so restaurant pages stay static.
// Reading the locale root param inside "use cache" adds it to the cache key, so
// each language is cached apart. Tags let a future dashboard refresh one restaurant.

// ObjectIds and owner data stay out: cached results must be plain values, and
// public pages have no business knowing who owns a restaurant
const withoutId = { projection: { _id: 0, ownerIds: 0, createdAt: 0 } };

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
        image: demoPhoto(restaurant.slug, item.id),
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

// Addresses that can't exist are answered without asking the database or filling
// the cache, so random URLs can't make the site do work or grow its cache
const isValidId = (value) => idSchema.safeParse(value).success;

export async function getRestaurantBySlug(slug) {
  return isValidId(slug) ? loadRestaurant(slug) : null;
}

async function loadRestaurant(slug) {
  "use cache";
  cacheLife("hours");
  cacheTag(`restaurant:${slug}`);
  const locale = await localeParam();
  const restaurant = await getDb().collection(RESTAURANTS).findOne({ slug }, withoutId);
  return restaurant ? localize(restaurant, locale) : null;
}

// One dish with its restaurant and category, for the dish page and modal
export async function getDish(slug, dishId) {
  return isValidId(slug) && isValidId(dishId) ? loadDish(slug, dishId) : null;
}

async function loadDish(slug, dishId) {
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
