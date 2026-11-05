"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useViewer } from "@/components/use-viewer";
import { setFavorite } from "@/lib/account/actions";

// The heart. It shows at once and goes back if saving fails. Someone signed out is
// taken to sign in, and comes back to this page.
export default function FavoriteButton({ slug, className = "" }) {
  const t = useTranslations("Site");
  const viewer = useViewer();
  const router = useRouter();
  const [choice, setChoice] = useState(null);
  const [, startTransition] = useTransition();
  const on = choice ?? Boolean(viewer?.favorites?.includes(slug));

  const toggle = () => {
    if (!viewer) {
      // Without /en: sign in adds the language back
      const here = window.location.pathname.replace(/^\/en(?=\/|$)/, "") || "/";
      router.push({ pathname: "/sign-in", query: { next: here } });
      return;
    }
    const next = !on;
    setChoice(next);
    startTransition(async () => {
      const result = await setFavorite(slug, next);
      if (result.error) setChoice(!next);
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      // Until it's known who is visiting, a tap wouldn't know what to do
      disabled={viewer === undefined}
      aria-pressed={on}
      aria-label={t(on ? "unfavorite" : "favorite")}
      className={`flex size-10 items-center justify-center rounded-pill bg-surface shadow-sm transition-colors duration-150 hover:bg-surface-muted ${className}`}
    >
      <svg viewBox="0 0 24 24" className={`size-5 ${on ? "text-danger" : "text-foreground"}`} fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
        <path d="M12 20.5s-7.5-4.6-9.5-9.2C1.2 8 3.1 4.5 6.7 4.5c2.1 0 3.8 1.1 5.3 3 1.5-1.9 3.2-3 5.3-3 3.6 0 5.5 3.5 4.2 6.8-2 4.6-9.5 9.2-9.5 9.2z" />
      </svg>
    </button>
  );
}
