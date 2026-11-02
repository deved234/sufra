import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Lives one level above [slug] on purpose: notFound() is called in the [slug] layout,
// and a layout's errors are caught by the boundary of the segment above it.
export default function RestaurantNotFound() {
  const t = useTranslations("Restaurant");
  const site = useTranslations("Site");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      {/* Only the root not-found can export metadata; React hoists this into <head> */}
      <title>{t("notFoundTitle")}</title>
      <span className="font-display text-display font-extrabold text-brand-text" dir="ltr">
        404
      </span>
      <h1 className="font-display text-h2 font-extrabold">{t("notFoundHeading")}</h1>
      <p className="max-w-md text-muted-foreground">{t("notFoundBody")}</p>
      <p className="text-sm text-muted-foreground">
        {t("poweredBy")}{" "}
        <Link href="/" className="font-semibold text-brand-text hover:underline">
          {site("name")}
        </Link>
      </p>
    </main>
  );
}
