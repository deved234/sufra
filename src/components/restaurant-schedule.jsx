"use client";

import { useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/booking-slots";
import { formatTime, riyadhDate } from "@/lib/opening-hours";

const subscribe = (callback) => {
  const id = setInterval(callback, 60_000);
  return () => clearInterval(id);
};
const getServerSnapshot = () => null;

// A restaurant's week, with today marked, and its coming closures. Which day is today
// depends on the visitor's moment, so like the open status it's worked out in the
// browser while the page itself stays static.
export default function RestaurantSchedule({ schedule }) {
  const t = useTranslations("Restaurant");
  const locale = useLocale();
  const today = useSyncExternalStore(subscribe, riyadhDate, getServerSnapshot);
  const weekday = today === null ? null : new Date(`${today}T00:00:00Z`).getUTCDay();
  const periodText = ({ opens, closes }) => `${formatTime(opens, locale)} – ${formatTime(closes, locale)}`;
  const coming = today === null ? [] : (schedule.exceptions ?? []).filter((item) => item.to >= today);
  const dayOptions = { weekday: "short", day: "numeric", month: "short" };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {schedule.weeklyHours && (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {schedule.weeklyHours.map(({ periods }, day) => (
            <li key={day} aria-current={day === weekday ? "date" : undefined} className={`flex flex-wrap justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm ${day === weekday ? "bg-brand-soft font-semibold text-on-brand-soft" : ""}`}>
              {/* A known Sunday gives weekday names in the reader's language */}
              <span>{formatDate(`2026-11-0${day + 1}`, locale, { weekday: "long" })}</span>
              <span>{periods.length ? periods.map(periodText).join(locale === "ar" ? "، " : ", ") : t("closedDay")}</span>
            </li>
          ))}
        </ul>
      )}
      {coming.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">{t("comingChanges")}</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {coming.map((item) => (
              <li key={item.id} className="rounded-md border border-border bg-surface p-3">
                <p className="font-semibold">
                  {item.from === item.to ? formatDate(item.from, locale, dayOptions) : `${formatDate(item.from, locale, dayOptions)} – ${formatDate(item.to, locale, dayOptions)}`}
                </p>
                <p className="text-muted-foreground">
                  {item.type === "hours" ? periodText(item) : t(item.type === "closed" ? "closedDay" : "noBookingDay")}
                  {item.note && ` · ${item.note}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
