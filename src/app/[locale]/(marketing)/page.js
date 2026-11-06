import { Suspense } from "react";
import Form from "next/form";
import { getLocale, getTranslations } from "next-intl/server";
import { alternatesFor } from "@/i18n/metadata";
import { getPathname, Link } from "@/i18n/navigation";
import { getListedRestaurants } from "@/lib/restaurants";
import AccountDeletedNotice from "@/components/account-deleted-notice";
import Photo from "@/components/photo";
import RestaurantGrid from "@/components/restaurant-grid";
import Reveal from "@/components/reveal";

const FEATURED = 6;
const QUICK_LINKS = 6;
const STEPS = ["find", "pick", "confirm"];

export async function generateMetadata() {
  return { alternates: await alternatesFor("/") };
}

// For people looking for somewhere to eat. Everything shown comes from the restaurants
// really on the site, read at build time and refreshed with their lists. Owners have
// their own page at /for-restaurants.
export default async function HomePage() {
  const [restaurants, t, locale] = await Promise.all([getListedRestaurants(), getTranslations("Home"), getLocale()]);
  const pictured = restaurants.filter((restaurant) => restaurant.photo || restaurant.image).slice(0, 3);

  return (
    <>
      <Suspense fallback={null}>
        <AccountDeletedNotice />
      </Suspense>
      <section className="bg-surface-tint">
        <div className={`mx-auto grid max-w-5xl items-center gap-10 px-6 py-16 md:py-24 ${pictured.length > 0 ? "md:grid-cols-[1.15fr_1fr]" : ""}`}>
          <div className="flex min-w-0 flex-col gap-6">
            <span className="text-sm font-semibold text-brand-text">{t("eyebrow")}</span>
            <h1 className="font-display text-h1 font-extrabold lg:text-display">{t("title")}</h1>
            <p className="max-w-xl text-lg text-muted-foreground">{t("lead")}</p>
            {/* Goes to /explore?q=..., which filters by it. A plain form, so it works before any script loads. */}
            <Form action={getPathname({ href: "/explore", locale })} role="search" className="flex max-w-xl flex-wrap gap-2 rounded-lg border border-border bg-surface p-2 shadow-sm sm:flex-nowrap">
              <input
                type="search"
                name="q"
                aria-label={t("searchLabel")}
                placeholder={t("searchPlaceholder")}
                className="min-w-0 flex-1 basis-40 rounded-md bg-transparent px-3 py-2.5 text-foreground placeholder:text-muted-foreground"
              />
              <button type="submit" className="w-full rounded-md bg-cta px-6 py-2.5 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover sm:w-auto">
                {t("searchSubmit")}
              </button>
            </Form>
            <Link href="/explore" className="self-start font-semibold text-brand-text hover:underline">
              {t("browse")}
            </Link>
          </div>
          {pictured.length > 0 && <HeroPhotos restaurants={pictured} />}
        </div>
      </section>

      <QuickLinks restaurants={restaurants} />

      {restaurants.length > 0 && <FeaturedRestaurants restaurants={restaurants.slice(0, FEATURED)} />}

      <Reveal>
        <section aria-labelledby="how" className="border-y border-border bg-surface">
          <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
            <h2 id="how" className="font-display text-h2 font-extrabold">
              {t("stepsTitle")}
            </h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {STEPS.map((key, index) => (
                <li key={key} data-reveal className="flex flex-col gap-2">
                  <span aria-hidden className="flex size-9 items-center justify-center rounded-pill bg-brand-soft font-bold text-on-brand-soft">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold">{t(`steps.${key}.title`)}</h3>
                  <p className="text-muted-foreground">{t(`steps.${key}.body`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-16">
          <div data-reveal className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface-tint p-6">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-h3 font-bold">{t("ownerTitle")}</h2>
              <p className="max-w-xl text-muted-foreground">{t("ownerBody")}</p>
            </div>
            <Link href="/for-restaurants" className="rounded-pill border border-border-strong bg-surface px-5 py-2.5 font-semibold transition-colors duration-150 hover:bg-surface-muted">
              {t("ownerLink")}
            </Link>
          </div>
        </section>
      </Reveal>
    </>
  );
}

// Three real restaurants, each leading to its page. The first is the largest, and the
// likely largest paint, so only it loads eagerly.
function HeroPhotos({ restaurants }) {
  return (
    <ul className="grid h-80 min-w-0 grid-cols-2 grid-rows-[3fr_2fr] gap-3 md:h-[26rem] md:grid-rows-2">
      {restaurants.map(({ slug, name, photo, photoKind, image }, index) => (
        <li key={slug} className={restaurants.length === 1 ? "col-span-2 row-span-2" : restaurants.length === 2 ? "row-span-2" : index === 0 ? "col-span-2 md:col-span-1 md:row-span-2" : ""}>
          <Link href={`/r/${slug}`} className="group relative block size-full overflow-hidden rounded-lg bg-surface-muted shadow-sm">
            <Photo
              photo={photo}
              image={image}
              kind={photoKind}
              // On a phone the first spans the full width, and the two below it half each
              sizes={index === 0 && restaurants.length !== 2 ? "(min-width: 768px) 240px, 100vw" : "(min-width: 768px) 240px, 50vw"}
              preload={index === 0}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
            />
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-3 pb-2.5 pt-8 text-sm font-semibold text-white">{name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// The most common values first, each once
function mostCommon(restaurants, field) {
  const counts = new Map();
  for (const restaurant of restaurants) {
    const key = restaurant[`${field}Key`];
    const entry = counts.get(key) ?? { key, label: restaurant[field], count: 0 };
    counts.set(key, { ...entry, count: entry.count + 1 });
  }
  return [...counts.values()].toSorted((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, QUICK_LINKS);
}

async function QuickLinks({ restaurants }) {
  const t = await getTranslations("Home");
  const groups = [
    { field: "city", title: t("citiesTitle") },
    { field: "cuisine", title: t("cuisinesTitle") },
  ]
    .map((group) => ({ ...group, links: mostCommon(restaurants, group.field) }))
    .filter((group) => group.links.length > 0);
  if (groups.length === 0) return null;

  return (
    <section aria-label={t("quickLabel")} className="mx-auto grid w-full max-w-5xl gap-6 px-6 pt-12 md:grid-cols-2">
      {groups.map(({ field, title, links }) => (
        <div key={field} className="flex flex-col gap-3">
          <h2 className="font-display font-bold">{title}</h2>
          <ul className="flex flex-wrap gap-2">
            {links.map(({ key, label }) => (
              <li key={key}>
                <Link
                  href={{ pathname: "/explore", query: { [field]: key } }}
                  className="block rounded-pill border border-border-strong bg-surface px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-surface-muted"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

async function FeaturedRestaurants({ restaurants }) {
  const t = await getTranslations("Explore");
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-h2 font-extrabold">{t("homeTitle")}</h2>
          <p className="text-muted-foreground">{t("homeLead")}</p>
        </div>
        <Link href="/explore" className="font-semibold text-brand-text hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      <RestaurantGrid restaurants={restaurants} preloadCount={0} />
    </section>
  );
}
