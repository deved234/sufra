import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import coverImage from "@/assets/dishes/kabsa-lahm.webp";
import { seedRestaurants } from "@/db/seed-data";
import { Link } from "@/i18n/navigation";
import { alternatesFor } from "@/i18n/metadata";
import { buildRestaurantTheme, themeStyle } from "@/lib/restaurant-theme";
import { localizeRestaurant } from "@/lib/restaurants";
import { DEMO_ACCENTS } from "@/lib/site/demo";
import EditorDemo from "@/components/editor-demo";
import Reveal from "@/components/reveal";
import TryDemoButton from "@/components/try-demo-button";

const FEATURES = ["site", "menu", "booking", "qr"];
const STEPS = ["account", "details", "publish"];

// What the demo and the blocks in it read, and of the editor's words only the ones it shows
const BLOCK_NAMESPACES = ["Site", "Menu", "Restaurant", "Dish", "OpenStatus", "EditorDemo"];
const EDITOR_WORDS = ["pageBlocks", "addBlock", "moveUp", "moveDown", "duplicate", "remove", "dragBlock", "look", "templates", "template", "undo", "redo", "previewSize", "previewMode", "device", "mode", "chooseBlock", "dnd", "blocks", "variants"];

export async function generateMetadata() {
  const t = await getTranslations("ForRestaurants");
  return { title: t("metaTitle"), description: t("lead"), alternates: await alternatesFor("/for-restaurants") };
}

// A sample restaurant from the seed data, so the demo needs no database and can't be
// affected by what's on the live site. Two sections are plenty to show a menu's looks.
function sampleRestaurant(locale) {
  const { menu, ...restaurant } = seedRestaurants[0];
  // Every dish has a tags list in the database, and the seed script adds the empty ones
  const sections = menu.slice(0, 2).map((category) => ({ ...category, items: category.items.map((dish) => ({ tags: [], ...dish })) }));
  return { ...localizeRestaurant({ ...restaurant, menu: sections }, locale), coverImage, booking: { enabled: true } };
}

// The restaurant owners' way in. It only promises what the platform does today.
export default async function ForRestaurantsPage() {
  const [t, locale, messages] = await Promise.all([getTranslations("ForRestaurants"), getLocale(), getMessages()]);
  const demoMessages = {
    ...Object.fromEntries(BLOCK_NAMESPACES.map((name) => [name, messages[name]])),
    SiteBuilder: Object.fromEntries(EDITOR_WORDS.map((key) => [key, messages.SiteBuilder[key]])),
  };
  const themes = Object.fromEntries(Object.entries(DEMO_ACCENTS).map(([name, accent]) => [name, { accent, style: themeStyle(buildRestaurantTheme(accent)) }]));

  const actions = (
    <div className="flex flex-wrap items-start gap-3">
      <Link href="/for-restaurants/sign-up" className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
        {t("signUp")}
      </Link>
      <Link href="/for-restaurants/sign-in" className="rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted">
        {t("signIn")}
      </Link>
      <NextIntlClientProvider messages={{ Form: messages.Form, Auth: { tryDemo: messages.Auth.tryDemo, tryDemoPending: messages.Auth.tryDemoPending } }}>
        <TryDemoButton />
      </NextIntlClientProvider>
    </div>
  );

  return (
    <>
      <section className="bg-surface-tint">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-16 md:py-24">
          <span className="text-sm font-semibold text-brand-text">{t("eyebrow")}</span>
          <h1 className="max-w-3xl font-display text-h1 font-extrabold md:text-display">{t("title")}</h1>
          <p className="max-w-xl text-lg text-muted-foreground">{t("lead")}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {actions}
            <a href="#try" className="font-semibold text-brand-text hover:underline">
              {t("tryDemo")}
            </a>
          </div>
        </div>
      </section>

      <section id="try" aria-labelledby="try-title" className="mx-auto flex w-full max-w-7xl scroll-mt-16 flex-col gap-6 px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-2">
          <h2 id="try-title" className="font-display text-h2 font-extrabold">
            {t("demoTitle")}
          </h2>
          <p className="max-w-2xl text-lg text-muted-foreground">{t("demoLead")}</p>
        </div>
        <NextIntlClientProvider messages={demoMessages}>
          <EditorDemo restaurant={sampleRestaurant(locale)} themes={themes} />
        </NextIntlClientProvider>
      </section>

      <Reveal>
        <section aria-labelledby="features" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
          <h2 id="features" className="font-display text-h2 font-extrabold">
            {t("featuresTitle")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {FEATURES.map((key) => (
              <li key={key} data-reveal className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
                <h3 className="font-display text-h3 font-bold">{t(`features.${key}.title`)}</h3>
                <p className="text-muted-foreground">{t(`features.${key}.body`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="steps" className="border-t border-border bg-surface">
          <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
            <h2 id="steps" className="font-display text-h2 font-extrabold">
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
            {actions}
          </div>
        </section>
      </Reveal>
    </>
  );
}
