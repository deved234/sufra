import { notFound } from "next/navigation";
import { alternatesFor } from "@/i18n/metadata";
import { photoUrl } from "@/lib/photos/url";
import { getRestaurants, getRestaurantBySlug } from "@/lib/restaurants";
import RestaurantView from "@/components/restaurant-view";

// Prerender every known restaurant at build time, once per language
// (the locale values come from the root layout's generateStaticParams).
// Unknown slugs still reach the page at request time and get a 404 below.
export async function generateStaticParams() {
  const restaurants = await getRestaurants();
  return restaurants.map((restaurant) => ({ slug: restaurant.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return {};

  return {
    // absolute skips the root "%s | سُفرة" template: this is the restaurant's site
    title: { absolute: restaurant.name },
    description: restaurant.tagline,
    alternates: await alternatesFor(`/r/${slug}`),
    // What shows when the link is shared in a chat
    ...(restaurant.cover && { openGraph: { title: restaurant.name, description: restaurant.tagline, images: [photoUrl(restaurant.cover.id, 1280)] } }),
  };
}

export default async function RestaurantPage({ params }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();
  return <RestaurantView restaurant={restaurant} />;
}
