import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/dal";
import { getOwnedRestaurant } from "@/lib/dashboard/data";
import { buildRestaurantTheme, themeStyle } from "@/lib/restaurant-theme";
import { localizeRestaurant } from "@/lib/restaurants";
import { getSiteDraft } from "@/lib/site/data";
import SiteEditor from "@/components/site-editor/site-editor";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("site") };
}

export default async function SiteEditorPage({ params }) {
  const { slug } = await params;
  const user = await requireUser(`/dashboard/${slug}/site`);
  const [restaurant, draft, locale] = await Promise.all([getOwnedRestaurant(slug, user), getSiteDraft(slug, user), getLocale()]);
  if (!restaurant || !draft) notFound();

  // Only what the blocks draw reaches the browser, with its dates and owner details left out
  const { site, ...rest } = restaurant;
  return <SiteEditor slug={slug} restaurant={localizeRestaurant(rest, locale)} themeStyle={themeStyle(buildRestaurantTheme(restaurant.accent))} initialBlocks={draft.blocks} initialRev={draft.rev} />;
}
