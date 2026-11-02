"use client";

import { useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatTime, isOpenAt, riyadhMinutesNow } from "@/lib/opening-hours";

// The page is static (built once), but "open now" depends on the visitor's moment.
// So it's computed in the browser: the server renders a placeholder (null snapshot),
// which keeps server and client HTML identical and avoids a hydration mismatch.

function subscribe(callback) {
  const id = setInterval(callback, 60_000);
  return () => clearInterval(id);
}

const getServerSnapshot = () => null;

export default function OpenStatus({ opens, closes }) {
  const t = useTranslations("OpenStatus");
  const locale = useLocale();
  const minutes = useSyncExternalStore(subscribe, riyadhMinutesNow, getServerSnapshot);

  if (minutes === null) {
    return <span aria-hidden className="inline-block h-7 w-44 rounded-pill bg-surface-muted" />;
  }

  const open = isOpenAt(minutes, opens, closes);

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 self-start rounded-pill px-3 py-1 text-sm font-medium ${
        open ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
      }`}
    >
      <span aria-hidden className="size-2 rounded-pill bg-current" />
      {open ? t("open", { time: formatTime(closes, locale) }) : t("closed", { time: formatTime(opens, locale) })}
    </span>
  );
}
