"use client";

import { useSyncExternalStore } from "react";

const motionQuery = "(prefers-reduced-motion: reduce)";

// Whether this person asked for less movement
export function useReducedMotion() {
  return useSyncExternalStore(
    (callback) => {
      const query = matchMedia(motionQuery);
      query.addEventListener("change", callback);
      return () => query.removeEventListener("change", callback);
    },
    () => matchMedia(motionQuery).matches,
    () => false,
  );
}

// The site's color mode, which lives on <html data-theme> outside React
export function useSiteTheme() {
  return useSyncExternalStore(
    (callback) => {
      const observer = new MutationObserver(callback);
      observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
      return () => observer.disconnect();
    },
    () => document.documentElement.dataset.theme ?? "light",
    () => "light",
  );
}
