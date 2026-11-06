import { useTranslations } from "next-intl";
import MenuItemCard from "@/components/menu/menu-item-card";

// data-menu-section is the hook CategoryTabs uses to hide other categories
// layout: the menu block's look. Widths are of the page's @container, not the screen.
const LISTS = {
  grid: "grid gap-4 @min-[40rem]:grid-cols-2",
  list: "flex flex-col gap-3",
  compact: "flex flex-col divide-y divide-border rounded-lg border border-border bg-surface",
};

export default function MenuSection({ category, slug, layout = "grid", preloadCount = 0 }) {
  const t = useTranslations("Menu");

  return (
    <section data-menu-section={category.id} aria-labelledby={`cat-${category.id}`} className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`cat-${category.id}`} className="font-display text-h3 font-bold">
          {category.name}
        </h3>
        {/* ICU plural: Arabic picks طبق واحد / طبقين / 3 أطباق / 11 طبق by itself */}
        <span className="text-sm text-muted-foreground">{t("dishCount", { count: category.items.length })}</span>
      </div>
      <ul className={LISTS[layout]}>
        {category.items.map((item, index) => (
          <MenuItemCard key={item.id} item={item} slug={slug} layout={layout} preload={index < preloadCount} />
        ))}
      </ul>
    </section>
  );
}
