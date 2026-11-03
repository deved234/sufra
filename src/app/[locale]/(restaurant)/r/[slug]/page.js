import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/i18n/metadata";
import { getRestaurants, getRestaurantBySlug } from "@/lib/restaurants";
import { Suspense } from "react";
import OpenStatus from "@/components/open-status";
import MenuSection from "@/components/menu/menu-section";
import CategoryTabs, { TabsList } from "@/components/menu/category-tabs";
import MenuReveal from "@/components/menu/menu-reveal";

// Prerender every known restaurant at build time, once per language
// (the locale values come from the root layout's generateStaticParams).
// Unknown slugs still reach the page at request time and get a 404 below.
export async function generateStaticParams() {
  const restaurants = await getRestaurants();
  return restaurants.map((restaurant) => ({ slug: restaurant.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return {};

  return {
    // absolute skips the root "%s | سُفرة" template: this is the restaurant's site
    title: { absolute: restaurant.name },
    description: restaurant.tagline,
    alternates: await alternatesFor(`/r/${slug}`),
  };
}

export default async function RestaurantPage({ params }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const t = await getTranslations("Restaurant");
  const categories = restaurant.menu.map(({ id, name }) => ({ id, name }));

  return (
    <>
      <section className="bg-surface-tint">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-16 md:py-24">
          <span className="text-sm font-semibold text-brand-text">
            {restaurant.cuisine} · {restaurant.city}
          </span>
          <h1 className="font-display text-h1 font-extrabold md:text-display">{restaurant.name}</h1>
          <p className="max-w-xl text-lg text-muted-foreground">{restaurant.tagline}</p>
          <div className="flex flex-wrap items-center gap-3">
            <OpenStatus opens={restaurant.opens} closes={restaurant.closes} />
            <p className="text-sm text-muted-foreground">{restaurant.hours}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="#book"
              className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
            >
              {t("book")}
            </a>
            <a
              href="#menu"
              className="rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted"
            >
              {t("seeMenu")}
            </a>
          </div>
        </div>
      </section>

      <section id="menu" className="mx-auto flex w-full max-w-5xl scroll-mt-16 flex-col gap-8 px-6 py-16">
        <h2 className="font-display text-h2 font-extrabold">{t("menu")}</h2>
        {/* useSearchParams needs a Suspense boundary to keep the page prerendered */}
        <Suspense fallback={<TabsList categories={categories} active="all" />}>
          <CategoryTabs categories={categories} />
        </Suspense>
        {restaurant.menu.length === 0 && <p className="text-muted-foreground">{t("menuEmpty")}</p>}
        <MenuReveal>
          {restaurant.menu.map((category, index) => (
            // Only the first two photos load eagerly: they're likely in the first view
            <MenuSection key={category.id} category={category} slug={slug} preloadCount={index === 0 ? 2 : 0} />
          ))}
        </MenuReveal>
      </section>

      <section id="book" className="scroll-mt-20 border-t border-border bg-surface-muted">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 py-16">
          <h2 className="font-display text-h2 font-extrabold">{t("book")}</h2>
          <p className="max-w-xl text-muted-foreground">{t("bookBody")}</p>
          <a
            href={`tel:${restaurant.phone.replaceAll(" ", "")}`}
            className="rounded-pill bg-brand px-6 py-3 font-semibold text-on-brand transition-colors duration-150 hover:bg-brand-hover"
          >
            {t("call")} <bdi dir="ltr">{restaurant.phone}</bdi>
          </a>
        </div>
      </section>
    </>
  );
}
