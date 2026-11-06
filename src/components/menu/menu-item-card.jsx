import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import Photo from "@/components/photo";
import DishTags from "@/components/menu/dish-tags";
import FavoriteButton from "@/components/favorite-button";

// One dish, in the look the menu block chose. The widths here are of the page's
// @container, not the screen, so the editor can show a phone-sized page on a computer.
//   grid:    a compact row with a thumbnail on narrow pages, a card with the photo on top on wide ones
//   card:    always the card
//   list:    always the row
//   compact: a plain line with no photo, for a long menu
const LOOKS = {
  grid: {
    link: "gap-4 p-3 @min-[40rem]:flex-col @min-[40rem]:gap-0 @min-[40rem]:p-0 rounded-lg border border-border bg-surface shadow-sm",
    photo: "size-24 rounded-md @min-[40rem]:aspect-[4/3] @min-[40rem]:size-auto @min-[40rem]:w-full @min-[40rem]:rounded-none",
    body: "@min-[40rem]:p-5",
    sizes: "(min-width: 1024px) 480px, (min-width: 640px) 50vw, 96px",
  },
  card: {
    link: "flex-col rounded-lg border border-border bg-surface shadow-sm",
    photo: "aspect-[4/3] w-full",
    body: "p-5",
    sizes: "288px",
  },
  // A short row has no room below the text, so the heart gets a column of its own
  list: {
    link: "gap-4 p-3 rounded-lg border border-border bg-surface shadow-sm",
    photo: "size-24 rounded-md",
    body: "pe-12",
    sizes: "96px",
  },
  compact: { link: "gap-4 px-4 py-3", photo: null, body: "pe-12", sizes: "" },
};

// The whole card links to the dish. From the menu, the link is intercepted and
// opens as a modal; scroll={false} keeps the menu where it was underneath.
export default function MenuItemCard({ item, slug, layout = "grid", preload = false }) {
  const locale = useLocale();
  const look = LOOKS[layout];
  const compact = layout === "compact";
  // A row with no photo and no tags is too short to keep the heart off the price
  const shortRow = layout === "grid" && !item.photo && !item.image && !item.badge && !item.tags?.length;

  return (
    <li data-dish-card className="relative">
      <Link
        href={`/r/${slug}/dish/${item.id}`}
        scroll={false}
        className={`group flex h-full overflow-hidden transition-shadow duration-150 ${compact ? "hover:bg-surface-muted" : "hover:shadow-md"} ${look.link}`}
      >
        {look.photo && (item.photo || item.image) && (
          <div className={`relative shrink-0 overflow-hidden bg-surface-muted ${look.photo}`}>
            <Photo
              photo={item.photo}
              image={item.image}
              alt={item.name}
              // The browser picks the smallest file that covers these widths
              sizes={look.sizes}
              preload={preload}
              className={`object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none ${
                item.available === false ? "opacity-60 grayscale" : ""
              }`}
            />
          </div>
        )}

        <div className={`flex min-w-0 flex-1 flex-col gap-1.5 ${look.body} ${shortRow ? "pb-9 @min-[40rem]:pb-5" : ""}`}>
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-semibold">{item.name}</h4>
            <span className="shrink-0 font-semibold text-brand-text">{formatPrice(item.price, locale)}</span>
          </div>
          <p className="text-sm text-muted-foreground">{item.description}</p>
          {/* Room for the heart in the corner */}
          <DishTags dish={item} className="mt-1 pe-10" />
        </div>
      </Link>
      <FavoriteButton slug={slug} dishId={item.id} className="absolute bottom-2 end-2" />
    </li>
  );
}
