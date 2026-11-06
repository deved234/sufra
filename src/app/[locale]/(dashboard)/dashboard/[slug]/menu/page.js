import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/dal";
import { getOwnedRestaurant } from "@/lib/dashboard/data";
import { demoPhoto } from "@/data/dish-images";
import RestaurantNav from "@/components/dashboard/restaurant-nav";
import MenuEditor from "@/components/dashboard/menu/menu-editor";

export async function generateMetadata() {
  const t = await getTranslations("MenuEditor");
  return { title: t("title") };
}

export default async function MenuPage({ params }) {
  const { slug } = await params;
  const user = await requireUser(`/dashboard/${slug}/menu`);
  const restaurant = await getOwnedRestaurant(slug, user);
  if (!restaurant) notFound();

  // The editor keeps both languages. Demo photos come along as static image data,
  // and owners' photos are already on the dish.
  const menu = restaurant.menu.map((category) => ({
    ...category,
    items: category.items.map((dish) => ({ ...dish, image: demoPhoto(restaurant.photosFrom ?? slug, dish.id) })),
  }));
  const locale = await getLocale();

  return (
    <>
      <RestaurantNav slug={slug} name={restaurant.name[locale]} current="menu" />
      <MenuEditor slug={slug} menu={menu} />
    </>
  );
}
