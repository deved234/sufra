"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

// A native <details>, so it opens before any JavaScript loads. This only closes it:
// on going to another page (the header stays), on a click outside, and on Escape.
export default function AccountDropdown({ label, trigger, children }) {
  const menu = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event) {
      if (!menu.current?.contains(event.target)) menu.current.open = false;
    }
    function onKeyDown(event) {
      if (event.key !== "Escape" || !menu.current?.open) return;
      menu.current.open = false;
      menu.current.querySelector("summary")?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details ref={menu} className="group relative">
      <summary
        aria-label={label}
        className="flex cursor-pointer list-none items-center gap-2 rounded-pill border border-border-strong px-2 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-surface-muted sm:px-3 [&::-webkit-details-marker]:hidden"
      >
        {trigger}
        <svg viewBox="0 0 24 24" className="size-4 transition-transform duration-150 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="absolute end-0 top-full z-50 mt-2 flex w-60 flex-col gap-1 rounded-lg border border-border bg-surface p-2 shadow-md">{children}</div>
    </details>
  );
}
