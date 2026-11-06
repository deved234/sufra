import { useLocale, useTranslations } from "next-intl";
import { telHref } from "@/components/site/blocks/block-helpers";

// How to reach the restaurant. The map link searches for the address, so nothing from
// a map service loads with the page.
export default function ContactBlock({ block, restaurant }) {
  const t = useTranslations("Restaurant");
  const locale = useLocale();
  const { showMap = true } = block.props;
  const address = `${restaurant.address}${locale === "ar" ? "، " : ", "}${restaurant.city}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <section id="contact" className="mx-auto flex w-full max-w-5xl scroll-mt-20 flex-col gap-6 px-6 py-12">
      <h2 className="font-display text-h2 font-extrabold">{t("contactTitle")}</h2>
      <div className="grid gap-4 @min-[40rem]:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-5">
          <p className="text-sm text-muted-foreground">{t("addressLabel")}</p>
          <p className="font-semibold">{address}</p>
          {showMap && (
            <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-2 self-start text-sm font-semibold text-brand-text hover:underline">
              {t("openMap")}
            </a>
          )}
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-5">
          <p className="text-sm text-muted-foreground">{t("phoneLabel")}</p>
          <a href={telHref(restaurant.phone)} className="self-start font-semibold hover:underline">
            <bdi dir="ltr">{restaurant.phone}</bdi>
          </a>
        </div>
      </div>
    </section>
  );
}
