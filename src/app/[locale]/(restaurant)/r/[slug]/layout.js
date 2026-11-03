import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRestaurantBySlug } from "@/lib/restaurants";
import { buildRestaurantTheme, themeStyle } from "@/lib/restaurant-theme";
import ThemeToggle from "@/components/theme-toggle";
import LocaleSwitcher from "@/components/locale-switcher";
import SkipLink from "@/components/skip-link";

// An unknown slug must wait for the full render instead of streaming a shell first,
// otherwise the response is already sent as 200 before notFound() can set 404.
export const ensureStatic = "navigation";
// For the same reason, navigating to a restaurant may block on its params:
// tells dev validation that this wait is intended.
export const instant = false;

// A restaurant's own site: its name up top, no Sufra navbar.
// Only a small "powered by" line links back to Sufra.
// modal is the @modal slot: a dish opened from the menu, or nothing
export default async function RestaurantLayout({ children, modal, params }) {
  const { locale, slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const t = await getTranslations("Restaurant");
  const site = await getTranslations("Site");

  // Computed on the server at build time: only plain CSS variables reach the page
  const theme = buildRestaurantTheme(restaurant.accent);

  return (
    <div data-restaurant style={themeStyle(theme)} className="flex flex-1 flex-col">
      {/* Colors the mobile browser bar. A plain <meta> that React hoists into <head>,
          rather than generateViewport: a viewport that depends on the slug would
          make every navigation in this site wait for it. */}
      {/* data-light/data-dark let the theme button override the device mode (theme-toggle.jsx) */}
      {[
        ["light", theme.light.brand],
        ["dark", theme.dark["surface-tint"]],
      ].map(([mode, color]) => (
        <meta
          key={mode}
          name="theme-color"
          media={`(prefers-color-scheme: ${mode})`}
          content={color}
          data-light={theme.light.brand}
          data-dark={theme.dark["surface-tint"]}
        />
      ))}
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        {/* Fixed h-16 so the sticky menu tabs (top-16) sit exactly below it */}
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
          <Link href={`/r/${restaurant.slug}`} className="min-w-0 truncate rounded-md font-display text-xl font-extrabold">
            {restaurant.name}
          </Link>
          <nav aria-label={t("sections", { name: restaurant.name })} className="flex shrink-0 items-center gap-1 text-sm">
            {/* Full paths, not just #menu: these also work from a dish page */}
            <Link href={`/r/${restaurant.slug}#menu`} className="hidden rounded-pill px-4 py-2 font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground sm:block">
              {t("menu")}
            </Link>
            <Link href={`/r/${restaurant.slug}#book`} className="hidden rounded-pill px-4 py-2 font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground sm:block">
              {t("book")}
            </Link>
            <ThemeToggle compact />
            <LocaleSwitcher />
          </nav>
        </div>
      </header>

      <main id="main" className="flex flex-1 flex-col">{children}</main>
      {modal}

      <footer className="mt-auto border-t border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {restaurant.name} · {restaurant.address}{locale === "ar" ? "، " : ", "}{restaurant.city}
          </p>
          <p>
            {t("poweredBy")}{" "}
            <Link href="/" className="font-semibold text-brand-text hover:underline">
              {site("name")}
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
