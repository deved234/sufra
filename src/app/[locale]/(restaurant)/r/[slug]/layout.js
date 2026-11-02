import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRestaurantBySlug } from "@/lib/restaurants";
import { buildRestaurantTheme, themeStyle } from "@/lib/restaurant-theme";
import ThemeToggle from "@/components/theme-toggle";
import LocaleSwitcher from "@/components/locale-switcher";

// An unknown slug must wait for the full render instead of streaming a shell first,
// otherwise the response is already sent as 200 before notFound() can set 404.
export const ensureStatic = "navigation";
// For the same reason, navigating to a restaurant may block on its params:
// tells dev validation that this wait is intended.
export const instant = false;

// Colors the mobile browser bar with the restaurant's color.
// Viewport settings have their own export, separate from metadata.
export async function generateViewport({ params }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return {};

  const theme = buildRestaurantTheme(restaurant.accent);
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: theme.light.brand },
      { media: "(prefers-color-scheme: dark)", color: theme.dark["surface-tint"] },
    ],
  };
}

// A restaurant's own site: its name up top, no Sufra navbar.
// Only a small "powered by" line links back to Sufra.
export default async function RestaurantLayout({ children, params }) {
  const { locale, slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const t = await getTranslations("Restaurant");
  const site = await getTranslations("Site");

  // Computed on the server at build time: only plain CSS variables reach the page
  const theme = buildRestaurantTheme(restaurant.accent);

  return (
    <div data-restaurant style={themeStyle(theme)} className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        {/* Fixed h-16 so the sticky menu tabs (top-16) sit exactly below it */}
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
          <Link href={`/r/${restaurant.slug}`} className="min-w-0 truncate rounded-md font-display text-xl font-extrabold">
            {restaurant.name}
          </Link>
          <nav aria-label={t("sections", { name: restaurant.name })} className="flex shrink-0 items-center gap-1 text-sm">
            <a href="#menu" className="hidden rounded-pill px-4 py-2 font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground sm:block">
              {t("menu")}
            </a>
            <a href="#book" className="hidden rounded-pill px-4 py-2 font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground sm:block">
              {t("book")}
            </a>
            <ThemeToggle compact />
            <LocaleSwitcher />
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

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
