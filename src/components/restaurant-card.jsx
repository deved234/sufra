import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import FavoriteButton from "@/components/favorite-button";
import OpenStatus from "@/components/open-status";

// One restaurant in a list, in its own colors. A place with no photos yet gets its
// first letter on its own color, so no card looks broken.
export default function RestaurantCard({ restaurant, preload = false }) {
  const t = useTranslations("Explore");
  const { slug, name, tagline, cuisine, city, image, style, opens, closes, bookable } = restaurant;

  return (
    // The heart sits beside the link, not in it: a button inside a link isn't valid
    <div data-restaurant style={style} className="relative h-full">
    <Link
      href={`/r/${slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-shadow duration-150 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-brand">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
            placeholder="blur"
            preload={preload}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <span aria-hidden className="absolute inset-0 flex items-center justify-center font-display text-display font-extrabold text-on-brand">
            {Array.from(name)[0]}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold text-brand-text">
          {cuisine} · {city}
        </p>
        <h3 className="font-display text-h3 font-bold">{name}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{tagline}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <OpenStatus opens={opens} closes={closes} live={false} />
          {bookable && <span className="rounded-pill bg-brand-soft px-3 py-1 text-sm font-medium text-on-brand-soft">{t("bookBadge")}</span>}
        </div>
      </div>
    </Link>
      <FavoriteButton slug={slug} className="absolute end-3 top-3" />
    </div>
  );
}
