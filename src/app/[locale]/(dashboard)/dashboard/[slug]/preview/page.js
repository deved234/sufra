import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getOwnedRestaurant } from "@/lib/dashboard/data";
import { buildRestaurantTheme, themeStyle } from "@/lib/restaurant-theme";
import { localizeRestaurant } from "@/lib/restaurants";
import RestaurantView from "@/components/restaurant-view";

export async function generateMetadata() {
  const t = await getTranslations("Status");
  return { title: t("previewTitle"), robots: { index: false } };
}

// The owner's look at their site before others can see it. It's for looking only, so
// its links are switched off: they lead to pages that aren't public yet.
export default async function RestaurantPreview({ params }) {
  const { slug } = await params;
  const user = await requireUser(`/dashboard/${slug}/preview`);
  const restaurant = await getOwnedRestaurant(slug, user.id);
  if (!restaurant) notFound();
  const [t, locale] = await Promise.all([getTranslations("Status"), getLocale()]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-soft p-4 text-on-brand-soft">
        <p className="font-semibold">{t("previewBanner")}</p>
        <Link href={`/dashboard/${slug}`} className="font-semibold underline">
          {t("previewBack")}
        </Link>
      </div>
      <div data-restaurant inert style={themeStyle(buildRestaurantTheme(restaurant.accent))} className="overflow-hidden rounded-lg border border-border bg-background">
        <RestaurantView restaurant={localizeRestaurant(restaurant, locale)} />
      </div>
    </div>
  );
}
