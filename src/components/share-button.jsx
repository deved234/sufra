"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const NOTICE_MS = 2500;

// The device's own share sheet where there is one, which already knows the person's
// apps. Elsewhere it copies the link. Shares the page being looked at, so an open dish
// shares that dish.
export default function ShareButton({ title, className = "" }) {
  const t = useTranslations("Site");
  const [notice, setNotice] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const say = (message) => {
    setNotice(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // They closed the sheet: nothing went wrong
        if (error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      say("shareCopied");
    } catch {
      say("shareFailed");
    }
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={share}
        aria-label={t("share")}
        className={`flex size-10 items-center justify-center rounded-pill bg-surface text-foreground shadow-sm transition-colors duration-150 hover:bg-surface-muted ${className}`}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" />
        </svg>
      </button>
      <span role="status" className="absolute end-0 bottom-full mb-2">
        {notice && <span className="block rounded-md bg-foreground px-2.5 py-1 text-xs font-medium whitespace-nowrap text-background shadow-sm">{t(notice)}</span>}
      </span>
    </span>
  );
}
