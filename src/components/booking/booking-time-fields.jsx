"use client";

import { useTranslations } from "next-intl";
import { useAvailability } from "@/components/booking/use-availability";
import { availableSlots, seatsWithout } from "@/lib/booking-slots";
import { formatTime } from "@/lib/opening-hours";

// The times that fit this party on a day, not counting `own` booking's seats when
// that booking is on the same day
export function useOpenTimes(slug, day, party, restaurant, own) {
  const { seats } = useAvailability(slug, day);
  if (!seats || !restaurant.booking) return null;
  const adjusted = own && own.date === day ? seatsWithout(seats, own) : seats;
  return availableSlots({ ...restaurant, date: day, seats: adjusted }).filter((slot) => slot.left >= party);
}

export function TimeSelect({ open, defaultTime, locale }) {
  const t = useTranslations("Bookings");
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {t("time")}
      {/* key: re-picks the default when the choices arrive, and keeps the choice after
          a refused submit, when React resets the form */}
      <select key={`${open?.length ?? "loading"}-${defaultTime}`} name="time" required defaultValue={defaultTime} disabled={!open?.length} className="w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 font-normal text-foreground focus-visible:border-ring">
        {!open?.length && <option value="">{open ? t("noTimes") : t("pickTime")}</option>}
        {open?.map((slot) => (
          <option key={slot.time} value={slot.time}>
            {formatTime(slot.time, locale)}
          </option>
        ))}
      </select>
    </label>
  );
}
