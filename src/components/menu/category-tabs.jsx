"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const ALL = "all";

// Pure UI, also used as the Suspense fallback (with "all" active) before the
// URL is known, so the bar is in the static HTML from the first paint.
export function TabsList({ categories, active, onSelect }) {
  const tabs = [{ id: ALL, name: "الكل" }, ...categories];

  return (
    <div className="sticky top-16 z-30 -mx-6 border-b border-border bg-background/90 px-6 py-3 backdrop-blur-md">
      <div role="group" aria-label="أقسام المنيو" className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((tab) => {
          const pressed = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => onSelect?.(tab.id)}
              className={`shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                pressed
                  ? "bg-foreground text-background"
                  : "border border-border-strong text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {tab.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The selected category lives in the URL (?category=mains): shareable, and Back works.
// The menu sections themselves stay Server Components; this only injects a CSS rule
// that hides the other sections, so the page remains fully static.
export default function CategoryTabs({ categories }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = searchParams.get("category");
  const active = categories.some((c) => c.id === requested) ? requested : ALL;

  function select(id) {
    if (id === active) return;
    const url = id === ALL ? pathname : `${pathname}?category=${id}`;
    router.push(url, { scroll: false });
  }

  return (
    <>
      {/* active is always one of our own ids, never raw user input */}
      {active !== ALL && <style>{`[data-menu-section]:not([data-menu-section="${active}"]){display:none}`}</style>}
      <TabsList categories={categories} active={active} onSelect={select} />
    </>
  );
}
