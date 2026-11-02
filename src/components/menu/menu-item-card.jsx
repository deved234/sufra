import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";

const badgeStyles = {
  popular: "bg-brand-soft text-on-brand-soft",
  new: "bg-info-soft text-info",
};

// Phone: a compact row with a thumbnail, like delivery apps.
// From sm up: a card with the photo on top.
export default function MenuItemCard({ item, preload = false }) {
  const t = useTranslations("Menu");
  const locale = useLocale();

  return (
    <li className="flex gap-4 overflow-hidden rounded-lg border border-border bg-surface p-3 shadow-sm sm:flex-col sm:gap-0 sm:p-0">
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
            className="object-cover"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-semibold">{item.name}</h4>
          <span className="shrink-0 font-semibold text-brand-text">{formatPrice(item.price, locale)}</span>
        </div>
        <p className="text-sm text-muted-foreground">{item.description}</p>
        {(item.badge || item.tags.length > 0) && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {item.badge && (
              <span className={`rounded-pill px-2.5 py-0.5 text-xs font-medium ${badgeStyles[item.badge]}`}>
                {t(`badges.${item.badge}`)}
              </span>
            )}
            {item.tags.map((tag) => (
              <span key={tag} className="rounded-pill border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {t(`tags.${tag}`)}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
