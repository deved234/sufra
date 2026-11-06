import { cacheLife, cacheTag } from "next/cache";
import { locale as localeParam } from "next/root-params";
import { getDb } from "@/db/client";
import { RESTAURANTS } from "@/db/config";
import { demoPhoto } from "@/data/dish-images";
import { NON_PUBLIC_STATUSES } from "@/lib/restaurant-status";
import { buildRestaurantTheme, themeStyle } from "@/lib/restaurant-theme";
import { normalizeSearch } from "@/lib/search-text";
import { idSchema } from "@/lib/validation/menu";

// The only place that knows where restaurant data comes from (MongoDB Atlas).
// Pages call these functions; they never see the database or its document shape.
// Results are cached and read at build time, so restaurant pages stay static.
// Reading the locale root param inside "use cache" adds it to the cache key, so
// each language is cached apart. Tags let a future dashboard refresh one restaurant.

// ObjectIds and owner data stay out: cached results must be plain values, and
// public pages have no business knowing who owns a restaurant
const withoutId = { projection: { _id: 0, ownerIds: 0, createdAt: 0, deletedAt: 0, bookingsSeenAt: 0 } };

// Drafts, hidden and deleted restaurants don't exist as far as visitors can tell. No
// status means published, for restaurants older than the field.
export const PUBLIC_RESTAURANT = { status: { $nin: NON_PUBLIC_STATUSES } };

export function localizeRestaurant(restaurant, locale) {
  const pick = (text) => text[locale];
  return {
    ...restaurant,
    name: pick(restaurant.name),
    tagline: pick(restaurant.tagline),
    cuisine: pick(restaurant.cuisine),
    city: pick(restaurant.city),
    address: pick(restaurant.address),
    menu: restaurant.menu.map((category) => ({
      ...category,
      name: pick(category.name),
      items: category.items.map(({ priceHalalas, ...item }) => ({
        ...item,
        name: pick(item.name),
        description: pick(item.description),
        price: priceHalalas / 100,
        // An uploaded photo wins, should a demo restaurant ever get one
        image: item.photo ? null : demoPhoto(restaurant.slug, item.id),
      })),
    })),
  };
}

export async function getRestaurants() {
  "use cache";
  cacheLife("hours");
  cacheTag("restaurants");
  const locale = await localeParam();
  const restaurants = await getDb().collection(RESTAURANTS).find(PUBLIC_RESTAURANT, withoutId).sort({ slug: 1 }).toArray();
  return restaurants.map((restaurant) => localizeRestaurant(restaurant, locale));
}

// Restaurants for the home page and /explore: only ones with something to show, so a
// new account's empty restaurant doesn't appear to visitors. Places with photos come
// first, then the newest. searchText holds both languages, and the dish names, so a
// search for a dish finds the restaurant that serves it.
export async function getListedRestaurants() {
  "use cache";
  cacheLife("hours");
  cacheTag("restaurants");
  const locale = await localeParam();
  const restaurants = await getDb()
    .collection(RESTAURANTS)
    .find(
      { ...PUBLIC_RESTAURANT, "menu.items.0": { $exists: true } },
      { projection: { _id: 0, slug: 1, name: 1, tagline: 1, cuisine: 1, city: 1, accent: 1, opens: 1, closes: 1, weeklyHours: 1, exceptions: 1, cover: 1, "booking.enabled": 1, "menu.items.id": 1, "menu.items.name": 1, "menu.items.photo": 1, createdAt: 1 } },
    )
    .sort({ createdAt: -1, slug: 1 })
    .toArray();

  const cards = restaurants.map((restaurant) => {
    const { slug, name, tagline, cuisine, city, accent, opens, closes, weeklyHours, exceptions, cover, booking, menu } = restaurant;
    const dishes = menu.flatMap((category) => category.items);
    // The card's picture: the cover, then the first dish with a photo
    const photo = cover ?? dishes.find((dish) => dish.photo)?.photo ?? null;
    const image = photo ? null : (dishes.map((dish) => demoPhoto(slug, dish.id)).find(Boolean) ?? null);
    const words = [name, cuisine, city].concat(dishes.map((dish) => dish.name)).flatMap((text) => [text.ar, text.en]);
    return {
      slug,
      name: name[locale],
      tagline: tagline[locale],
      cuisine: cuisine[locale],
      cuisineKey: cuisine.en,
      city: city[locale],
      cityKey: city.en,
      photo,
      photoKind: cover ? "cover" : "dish",
      image,
      style: themeStyle(buildRestaurantTheme(accent)),
      schedule: { opens, closes, weeklyHours, exceptions },
      bookable: Boolean(booking?.enabled),
      searchText: normalizeSearch([slug, ...words].join(" ")),
    };
  });
  const hasPicture = (card) => Boolean(card.photo || card.image);
  return cards.toSorted((a, b) => hasPicture(b) - hasPicture(a));
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
  const restaurant = await getDb().collection(RESTAURANTS).findOne({ slug, ...PUBLIC_RESTAURANT }, withoutId);
  return restaurant ? localizeRestaurant(restaurant, locale) : null;
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
    .find(PUBLIC_RESTAURANT, { projection: { _id: 0, slug: 1, "menu.items.id": 1 } })
    .toArray();
  return restaurants.flatMap((restaurant) =>
    restaurant.menu.flatMap((category) => category.items.map((item) => ({ slug: restaurant.slug, dishId: item.id }))),
  );
}
