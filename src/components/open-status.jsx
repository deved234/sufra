"use client";

import { useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/booking-slots";
import { formatTime, openStateAt, riyadhMinutesNow } from "@/lib/opening-hours";

// The page is static (built once), but "open now" depends on the visitor's moment.
// So it's computed in the browser: the server renders a placeholder (null snapshot),
// which keeps server and client HTML identical and avoids a hydration mismatch.

function subscribe(callback) {
  const id = setInterval(callback, 60_000);
  return () => clearInterval(id);
}

const getServerSnapshot = () => null;

// live: announce changes to screen readers, for a page's one status. Off in lists,
// where every card would speak up.
export default function OpenStatus({ schedule, live = true }) {
  const t = useTranslations("OpenStatus");
  const locale = useLocale();
  const minutes = useSyncExternalStore(subscribe, riyadhMinutesNow, getServerSnapshot);

  if (minutes === null) {
    return <span aria-hidden className="inline-block h-7 w-44 rounded-pill bg-surface-muted" />;
  }

  const state = openStateAt(schedule);
  const { open } = state;
  const label = open
    ? t("open", { time: formatTime(state.closes, locale) })
    : !state.opens
      ? t("closedLong")
      : state.days === 0
        ? t("closed", { time: formatTime(state.opens, locale) })
        : state.days === 1
          ? t("closedTomorrow", { time: formatTime(state.opens, locale) })
          : t("closedDay", { day: formatDate(state.date, locale, { weekday: "long" }), time: formatTime(state.opens, locale) });

  return (
    <span
      role={live ? "status" : undefined}
      className={`inline-flex items-center gap-2 self-start rounded-pill px-3 py-1 text-sm font-medium ${
        open ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
      }`}
    >
      <span aria-hidden className="size-2 rounded-pill bg-current" />
      {label}
    </span>
  );
}
