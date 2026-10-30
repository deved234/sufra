"use client";

import { useSyncExternalStore } from "react";

// The theme lives on <html data-theme>, outside React, so we subscribe to it
function subscribe(callback) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getTheme = () => document.documentElement.dataset.theme;
// The server can't know the visitor's theme
const getServerTheme = () => null;

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-pill border border-border-strong px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-surface-muted"
    >
      {theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
    </button>
  );
}
