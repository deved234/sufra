import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { pickMessagesIn } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/dal";
import { getOwnedRestaurant } from "@/lib/dashboard/data";
import { buildRestaurantTheme, themeStyle } from "@/lib/restaurant-theme";
import { localizeRestaurant } from "@/lib/restaurants";
import { getSiteDraft } from "@/lib/site/data";
import SiteEditor from "@/components/site-editor/site-editor";

// What the blocks read, for the page shown in the preview
const BLOCK_NAMESPACES = ["Site", "Menu", "Restaurant", "Dish", "OpenStatus"];

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("site") };
}

export default async function SiteEditorPage({ params }) {
  const { slug } = await params;
  const user = await requireUser(`/dashboard/${slug}/site`);
  const [restaurant, draft, locale] = await Promise.all([getOwnedRestaurant(slug, user), getSiteDraft(slug, user), getLocale()]);
  if (!restaurant || !draft) notFound();

  // Only what the blocks draw reaches the browser. The preview can show either language
  // whichever one the editor is in, so it gets the restaurant and the words in both.
  const { site, ...rest } = restaurant;
  const previews = Object.fromEntries(
    await Promise.all(
      routing.locales.map(async (language) => [language, { restaurant: localizeRestaurant(rest, language), messages: await pickMessagesIn(language, BLOCK_NAMESPACES) }]),
    ),
  );

  return <SiteEditor slug={slug} locale={locale} previews={previews} themeStyle={themeStyle(buildRestaurantTheme(restaurant.accent))} initialBlocks={draft.blocks} initialRev={draft.rev} />;
}
