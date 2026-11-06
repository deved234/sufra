import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import FavoriteButton from "@/components/favorite-button";
import OpenStatus from "@/components/open-status";
import Photo from "@/components/photo";
import { scheduleOf } from "@/components/site/blocks/block-helpers";

// The restaurant's introduction. A look that needs a cover falls back to the plain one
// until there is a cover.
export default function HeroBlock({ block, restaurant, context }) {
  const variant = restaurant.cover ? block.variant : "tinted";
  const content = <HeroContent block={block} restaurant={restaurant} context={context} />;

  if (variant === "cover") {
    return (
      <section className="relative isolate overflow-hidden bg-black text-white">
        <Photo photo={restaurant.cover} kind="cover" sizes="100vw" preload className="-z-10 object-cover opacity-50" />
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-24 @min-[48rem]:py-36">{content}</div>
      </section>
    );
  }

  if (variant === "split") {
    return (
      <section className="bg-surface-tint">
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-6 py-12 @min-[48rem]:grid-cols-2 @min-[48rem]:py-20">
          <div className="flex flex-col gap-5">{content}</div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-surface-muted">
            <Photo photo={restaurant.cover} kind="cover" sizes="(min-width: 768px) 480px, 100vw" preload className="object-cover" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {restaurant.cover && (
        <div className="relative aspect-[16/9] max-h-[28rem] w-full overflow-hidden bg-surface-muted @min-[48rem]:aspect-[21/9]">
          <Photo photo={restaurant.cover} kind="cover" sizes="100vw" preload className="object-cover" />
        </div>
      )}
      <section className="bg-surface-tint">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-16 @min-[48rem]:py-24">{content}</div>
      </section>
    </>
  );
}

function HeroContent({ block, restaurant, context }) {
  const t = useTranslations("Restaurant");
  const { slug } = restaurant;
  const { showTagline = true, showStatus = true } = block.props;
  const onPhoto = restaurant.cover && block.variant === "cover";
  const bookable = restaurant.booking?.enabled;
  // Without online booking the button leads to the booking block, if the page has one
  const bookHref = bookable ? `/r/${slug}/book` : context.hasBooking ? "#book" : null;

  return (
    <>
      <span className={`text-sm font-semibold ${onPhoto ? "text-white" : "text-brand-text"}`}>
        {restaurant.cuisine} · {restaurant.city}
      </span>
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-h1 font-extrabold @min-[48rem]:text-display">{restaurant.name}</h1>
        <FavoriteButton slug={slug} className="mt-2 shrink-0" />
      </div>
      {showTagline && <p className={`max-w-xl text-lg ${onPhoto ? "text-white" : "text-muted-foreground"}`}>{restaurant.tagline}</p>}
      {showStatus && (
        <div className="flex flex-wrap items-center gap-3">
          <OpenStatus schedule={scheduleOf(restaurant)} />
          {context.hasHours && (
            <a href="#hours" className={`text-sm font-semibold hover:underline ${onPhoto ? "text-white" : "text-brand-text"}`}>
              {t("seeHours")}
            </a>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {bookHref && (
          <Link href={bookHref} className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
            {t("book")}
          </Link>
        )}
        <a href="#menu" className="rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold text-foreground transition-colors duration-150 hover:bg-surface-muted">
          {t("seeMenu")}
        </a>
      </div>
    </>
  );
}
