import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/i18n/metadata";
import { pickMessages } from "@/i18n/messages";
import { getListedRestaurants } from "@/lib/restaurants";
import ExploreList from "@/components/explore-list";
import RestaurantGrid from "@/components/restaurant-grid";

export async function generateMetadata() {
  const t = await getTranslations("Explore");
  return { title: t("metaTitle"), description: t("lead"), alternates: await alternatesFor("/explore") };
}

export default async function ExplorePage() {
  const [restaurants, t, messages] = await Promise.all([getListedRestaurants(), getTranslations("Explore"), pickMessages(["Explore", "OpenStatus"])]);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 md:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 font-extrabold">{t("title")}</h1>
        <p className="max-w-xl text-lg text-muted-foreground">{t("lead")}</p>
      </div>
      <NextIntlClientProvider messages={messages}>
        {/* The filters read the URL, which a static page only knows in the browser.
            Until then, and for search engines, the full list is already in the HTML. */}
        <Suspense fallback={<RestaurantGrid restaurants={restaurants} />}>
          <ExploreList restaurants={restaurants} />
        </Suspense>
      </NextIntlClientProvider>
    </section>
  );
}
