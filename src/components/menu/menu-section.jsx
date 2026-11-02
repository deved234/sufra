import MenuItemCard from "@/components/menu/menu-item-card";
import { formatDishCount } from "@/lib/format";

// data-menu-section is the hook CategoryTabs uses to hide other categories
export default function MenuSection({ category, preloadCount = 0 }) {
  return (
    <section data-menu-section={category.id} aria-labelledby={`cat-${category.id}`} className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`cat-${category.id}`} className="font-display text-h3 font-bold">
          {category.name}
        </h3>
        <span className="text-sm text-muted-foreground">{formatDishCount(category.items.length)}</span>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {category.items.map((item, index) => (
          <MenuItemCard key={item.id} item={item} preload={index < preloadCount} />
        ))}
      </ul>
    </section>
  );
}
