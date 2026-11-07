import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { alternatesFor } from "@/i18n/metadata";
import { getDish, getDishParams } from "@/lib/restaurants";
import { dishShare } from "@/lib/site/share-image";
import DishDetails from "@/components/dish-details";
import MenuItemCard from "@/components/menu/menu-item-card";

// The full dish page: what you get when opening a dish link directly or
// refreshing. From the menu, the same URL opens as a modal instead
// (see @modal/(.)dish/[dishId]).

// Every known dish is prerendered; an unknown one waits for the full render so it
// can answer 404 (like the restaurant layout). Tells dev validation that's intended.
export const instant = false;

export async function generateStaticParams() {
  return getDishParams();
}

export async function generateMetadata({ params }) {
  const { slug, dishId } = await params;
  const found = await getDish(slug, dishId);
  if (!found) return {};

  return {
    title: { absolute: `${found.dish.name} | ${found.restaurant.name}` },
    description: found.dish.description,
    alternates: await alternatesFor(`/r/${slug}/dish/${dishId}`),
    ...dishShare(found.dish, found.restaurant),
  };
}

export default async function DishPage({ params }) {
  const { slug, dishId } = await params;
  const found = await getDish(slug, dishId);
  if (!found) notFound();

  const { category, dish } = found;
  const others = category.items.filter((item) => item.id !== dish.id);
  const t = await getTranslations("Dish");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-10">
      <Link href={`/r/${slug}#menu`} className="self-start rounded-pill px-1 font-semibold text-brand-text hover:underline">
        <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t("backToMenu")}
      </Link>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <DishDetails dish={dish} category={category} slug={slug} sizes="(min-width: 768px) 720px, 100vw" preload />
      </div>

      {others.length > 0 && (
        <section aria-labelledby="more-dishes" className="flex flex-col gap-4">
          <h2 id="more-dishes" className="font-display text-h3 font-bold">
            {t("more", { category: category.name })}
          </h2>
          <ul className="grid gap-4 @min-[40rem]:grid-cols-2">
            {others.map((item) => (
              <MenuItemCard key={item.id} item={item} slug={slug} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
