"use client";

import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { telHref } from "@/components/site/blocks/block-helpers";

// Booking and calling, always in reach on a phone. It stays away while the hero's own
// button is on screen and on the booking page itself. A page with no such button shows
// it after a screen of scrolling, which the marker measures. Labels come from the
// server, so this adds nothing to the page's messages.
export default function MobileBookBar({ href, phone, bookLabel, callLabel }) {
  const pathname = usePathname();
  const marker = useRef(null);
  const [shown, setShown] = useState(false);
  const onBookPage = pathname.endsWith("/book");

  useEffect(() => {
    if (onBookPage) return;
    // A page left behind by client navigation can still be in the DOM, hidden
    const heroButton = [...document.querySelectorAll("[data-hero-book]")].find((element) => element.offsetParent !== null);
    const observer = new IntersectionObserver(([entry]) => {
      setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(heroButton ?? marker.current);
    return () => observer.disconnect();
  }, [pathname, onBookPage]);

  if (onBookPage) return null;

  return (
    <>
      <div ref={marker} aria-hidden className="pointer-events-none absolute start-0 top-0 h-dvh w-px" />
      {/* Room below the footer, so the bar never covers it */}
      <div aria-hidden className="h-[calc(5rem+env(safe-area-inset-bottom))] bg-surface sm:hidden" />
      {/* invisible, not just moved away: its links leave the tab order too */}
      <div
        data-testid="mobile-book-bar"
        className={`fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-border bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-[translate,visibility] duration-200 motion-reduce:transition-none sm:hidden ${shown ? "visible translate-y-0" : "invisible translate-y-full"}`}
      >
        <Link href={href} className="flex-1 rounded-pill bg-cta px-4 py-3 text-center font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
          {bookLabel}
        </Link>
        <a href={telHref(phone)} className="rounded-pill border border-border-strong px-6 py-3 text-center font-semibold transition-colors duration-150 hover:bg-surface-muted">
          {callLabel}
        </a>
      </div>
    </>
  );
}
