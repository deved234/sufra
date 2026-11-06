import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FavoriteButton from "@/components/favorite-button";
import OpenStatus from "@/components/open-status";
import Photo from "@/components/photo";
import RestaurantSchedule from "@/components/restaurant-schedule";
import MenuSection from "@/components/menu/menu-section";
import CategoryTabs, { TabsList } from "@/components/menu/category-tabs";
import MenuReveal from "@/components/menu/menu-reveal";

// The body of a restaurant's page, for the public site and the owner's preview.
// Takes a localized restaurant.
export default async function RestaurantView({ restaurant }) {
  const { slug } = restaurant;
  const t = await getTranslations("Restaurant");
  const categories = restaurant.menu.map(({ id, name }) => ({ id, name }));
  const bookable = restaurant.booking?.enabled;
  const schedule = { opens: restaurant.opens, closes: restaurant.closes, weeklyHours: restaurant.weeklyHours, exceptions: restaurant.exceptions };

  return (
    <>
      {restaurant.cover && (
        <div className="relative aspect-[16/9] max-h-[28rem] w-full overflow-hidden bg-surface-muted md:aspect-[21/9]">
          <Photo photo={restaurant.cover} kind="cover" sizes="100vw" preload className="object-cover" />
        </div>
      )}
      <section className="bg-surface-tint">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-16 md:py-24">
          <span className="text-sm font-semibold text-brand-text">
            {restaurant.cuisine} · {restaurant.city}
          </span>
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-h1 font-extrabold md:text-display">{restaurant.name}</h1>
            <FavoriteButton slug={slug} className="mt-2 shrink-0" />
          </div>
          <p className="max-w-xl text-lg text-muted-foreground">{restaurant.tagline}</p>
          <div className="flex flex-wrap items-center gap-3">
            <OpenStatus schedule={schedule} />
            <a href="#hours" className="text-sm font-semibold text-brand-text hover:underline">
              {t("seeHours")}
            </a>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={bookable ? `/r/${slug}/book` : "#book"}
              className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
            >
              {t("book")}
            </Link>
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

      <section id="hours" className="mx-auto flex w-full max-w-5xl scroll-mt-20 flex-col gap-6 px-6 pb-16">
        <h2 className="font-display text-h2 font-extrabold">{t("hoursTitle")}</h2>
        <RestaurantSchedule schedule={schedule} />
      </section>

      <section id="book" className="scroll-mt-20 border-t border-border bg-surface-muted">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 py-16">
          <h2 className="font-display text-h2 font-extrabold">{t("book")}</h2>
          <p className="max-w-xl text-muted-foreground">{t(bookable ? "bookOnlineBody" : "bookBody")}</p>
          <div className="flex flex-wrap gap-3">
            {bookable && (
              <Link
                href={`/r/${slug}/book`}
                className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
              >
                {t("bookNow")}
              </Link>
            )}
            <a
              href={`tel:${restaurant.phone.replaceAll(" ", "")}`}
              className={
                bookable
                  ? "rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted"
                  : "rounded-pill bg-brand px-6 py-3 font-semibold text-on-brand transition-colors duration-150 hover:bg-brand-hover"
              }
            >
              {t("call")} <bdi dir="ltr">{restaurant.phone}</bdi>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
