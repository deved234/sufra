import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import DishTags from "@/components/menu/dish-tags";

// Phone: a compact row with a thumbnail, like delivery apps.
// From sm up: a card with the photo on top.
// The whole card links to the dish. From the menu, the link is intercepted and
// opens as a modal; scroll={false} keeps the menu where it was underneath.
export default function MenuItemCard({ item, slug, preload = false }) {
  const locale = useLocale();

  return (
    <li data-dish-card>
      <Link
        href={`/r/${slug}/dish/${item.id}`}
        scroll={false}
        className="group flex h-full gap-4 overflow-hidden rounded-lg border border-border bg-surface p-3 shadow-sm transition-shadow duration-150 hover:shadow-md sm:flex-col sm:gap-0 sm:p-0"
      >
        {item.image && (
          <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-surface-muted sm:aspect-[4/3] sm:size-auto sm:w-full sm:rounded-none">
            <Image
              src={item.image}
              alt={item.name}
              fill
              // The browser picks the smallest file that covers these widths
              sizes="(min-width: 1024px) 480px, (min-width: 640px) 50vw, 96px"
              placeholder="blur"
              preload={preload}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-semibold">{item.name}</h4>
            <span className="shrink-0 font-semibold text-brand-text">{formatPrice(item.price, locale)}</span>
          </div>
          <p className="text-sm text-muted-foreground">{item.description}</p>
          <DishTags dish={item} className="mt-1" />
        </div>
      </Link>
    </li>
  );
}
