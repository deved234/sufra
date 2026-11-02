import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/restaurants";
import ThemeToggle from "@/components/theme-toggle";

// An unknown slug must wait for the full render instead of streaming a shell first,
// otherwise the response is already sent as 200 before notFound() can set 404.
export const ensureStatic = "navigation";
// For the same reason, navigating to a restaurant may block on its params:
// tells dev validation that this wait is intended.
export const instant = false;

// A restaurant's own site: its name up top, no Sufra navbar.
// Only a small "powered by" line links back to Sufra.
export default async function RestaurantLayout({ children, params }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        {/* Fixed h-16 so the sticky menu tabs (top-16) sit exactly below it */}
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
          <Link href={`/r/${restaurant.slug}`} className="rounded-md font-display text-xl font-extrabold">
            {restaurant.name}
          </Link>
          <nav aria-label={`أقسام ${restaurant.name}`} className="flex items-center gap-1 text-sm">
            <a href="#menu" className="hidden rounded-pill px-4 py-2 font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground sm:block">
              المنيو
            </a>
            <a href="#book" className="hidden rounded-pill px-4 py-2 font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground sm:block">
              احجز طاولة
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="mt-auto border-t border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {restaurant.name} · {restaurant.address}، {restaurant.city}
          </p>
          <p>
            مدعوم من{" "}
            <Link href="/" className="font-semibold text-brand-text hover:underline">
              سُفرة
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
