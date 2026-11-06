import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { telHref } from "@/components/site/blocks/block-helpers";

// Book online when the restaurant takes bookings, and a phone number either way
export default function BookingBlock({ block, restaurant }) {
  const t = useTranslations("Restaurant");
  const bookable = restaurant.booking?.enabled;
  const content = (
    <>
      <h2 className="font-display text-h2 font-extrabold">{t("book")}</h2>
      <p className="max-w-xl text-muted-foreground">{t(bookable ? "bookOnlineBody" : "bookBody")}</p>
      <div className="flex flex-wrap gap-3">
        {bookable && (
          <Link href={`/r/${restaurant.slug}/book`} className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
            {t("bookNow")}
          </Link>
        )}
        <a
          href={telHref(restaurant.phone)}
          className={
            bookable
              ? "rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted"
              : "rounded-pill bg-brand px-6 py-3 font-semibold text-on-brand transition-colors duration-150 hover:bg-brand-hover"
          }
        >
          {t("call")} <bdi dir="ltr">{restaurant.phone}</bdi>
        </a>
      </div>
    </>
  );

  if (block.variant === "card") {
    return (
      <section id="book" className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 py-12">
        <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface-tint p-6 shadow-sm @min-[48rem]:p-10">{content}</div>
      </section>
    );
  }
  return (
    <section id="book" className="scroll-mt-20 border-t border-border bg-surface-muted">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 py-16">{content}</div>
    </section>
  );
}
