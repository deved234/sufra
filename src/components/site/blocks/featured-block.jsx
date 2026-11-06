import { useLocale, useTranslations } from "next-intl";
import MenuItemCard from "@/components/menu/menu-item-card";
import { inLanguage } from "@/components/site/blocks/block-helpers";

// Chosen dishes, read from the current menu, so a dish that left it just drops out
export default function FeaturedBlock({ block, restaurant, context }) {
  const t = useTranslations("Restaurant");
  const locale = useLocale();
  const all = restaurant.menu.flatMap((category) => category.items);
  const dishes = (block.props.dishes ?? []).map((id) => all.find((dish) => dish.id === id)).filter(Boolean);

  if (dishes.length === 0) {
    return context.editing ? <p className="mx-auto w-full max-w-5xl px-6 py-8 text-muted-foreground">{t("featuredEmpty")}</p> : null;
  }

  const strip = block.variant === "strip";
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <h2 className="font-display text-h2 font-extrabold">{inLanguage(block.props.title, locale) || t("featuredTitle")}</h2>
      <ul className={strip ? "flex snap-x gap-4 overflow-x-auto pb-2 [&>li]:w-72 [&>li]:shrink-0 [&>li]:snap-start" : "grid gap-4 @min-[40rem]:grid-cols-2 @min-[64rem]:grid-cols-3"}>
        {dishes.map((dish) => (
          <MenuItemCard key={dish.id} item={dish} slug={restaurant.slug} layout={strip ? "card" : "grid"} />
        ))}
      </ul>
    </section>
  );
}
