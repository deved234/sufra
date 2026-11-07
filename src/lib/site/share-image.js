import { photoUrl } from "@/lib/photos/url";

// What a shared link shows in a chat. The widths are ones each kind of photo already
// has, so sharing makes no new sizes on Cloudinary. A demo dish's picture is a file in
// the project, whose relative address metadataBase makes absolute.

const DEFAULT_IMAGE = "/og.png";

const dishImage = (dish) => (dish.photo ? photoUrl(dish.photo.id, 1200) : (dish.image?.src ?? null));

// The cover, then the first dish with a picture
export function restaurantImage(restaurant) {
  if (restaurant.cover) return photoUrl(restaurant.cover.id, 1280);
  return restaurant.menu.flatMap((category) => category.items).map(dishImage).find(Boolean) ?? null;
}

// A page's own openGraph and twitter replace the root layout's entirely, so these are whole
export function shareMetadata({ title, description, image }) {
  const images = [image ?? DEFAULT_IMAGE];
  return {
    openGraph: { type: "website", title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export const restaurantShare = (restaurant) => shareMetadata({ title: restaurant.name, description: restaurant.tagline, image: restaurantImage(restaurant) });

export const dishShare = (dish, restaurant) =>
  shareMetadata({ title: `${dish.name} | ${restaurant.name}`, description: dish.description, image: dishImage(dish) ?? restaurantImage(restaurant) });
