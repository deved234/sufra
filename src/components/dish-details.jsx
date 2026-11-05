import Image from "next/image";
import { useLocale } from "next-intl";
import { formatPrice } from "@/lib/format";
import DishTags from "@/components/menu/dish-tags";
import FavoriteButton from "@/components/favorite-button";

// A dish's photo and details. Shared by the full dish page (heading h1) and the
// modal (heading h2, labelled by headingId).
export default function DishDetails({ dish, category, slug, as: Heading = "h1", headingId, sizes, preload = false }) {
  const locale = useLocale();

  return (
    <article className="flex flex-col">
      {dish.image && (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
          <Image
            src={dish.image}
            alt={dish.name}
            fill
            sizes={sizes}
            placeholder="blur"
            preload={preload}
            className={`object-cover ${dish.available === false ? "opacity-60 grayscale" : ""}`}
          />
        </div>
      )}
      <div className="flex flex-col gap-3 p-6">
        <span className="text-sm font-semibold text-brand-text">{category.name}</span>
        <div className="flex items-start justify-between gap-4">
          <Heading id={headingId} className="font-display text-h2 font-extrabold">
            {dish.name}
          </Heading>
          <span className="mt-2 shrink-0 text-lg font-bold text-brand-text">{formatPrice(dish.price, locale)}</span>
        </div>
        <p className="text-lg text-muted-foreground">{dish.description}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DishTags dish={dish} />
          <FavoriteButton slug={slug} dishId={dish.id} className="border border-border" />
        </div>
      </div>
    </article>
  );
}
