"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { FormAlert } from "@/components/form/field";
import { cancelMyBooking } from "@/lib/booking/actions";
import { buildIcs } from "@/lib/booking-ics";

// The file is built right here in the browser: all it needs is already on the page
export function AddToCalendar({ calendar }) {
  const t = useTranslations("Booking");
  const download = () => {
    const url = URL.createObjectURL(new Blob([buildIcs(calendar)], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "booking.ics";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button type="button" onClick={download} className="rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted">
      {t("addToCalendar")}
    </button>
  );
}

// Two steps, because a cancelled booking's seats can be gone a minute later
export function CancelBooking({ id }) {
  const t = useTranslations("Booking");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  const cancel = () =>
    startTransition(async () => {
      const result = await cancelMyBooking(id);
      if (result.error) setError(result.error);
      setAsking(false);
    });

  if (!asking) {
    return (
      <div className="flex flex-col items-start gap-3">
        <FormAlert error={error} />
        <button type="button" onClick={() => setAsking(true)} className="rounded-pill px-5 py-3 font-semibold text-danger transition-colors duration-150 hover:bg-danger-soft">
          {t("cancel")}
        </button>
      </div>
    );
  }
  return (
    <div role="group" aria-label={t("cancelConfirm")} className="flex flex-col gap-3 rounded-md bg-danger-soft p-4">
      <p className="font-medium">{t("cancelConfirm")}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={cancel} disabled={pending} className="rounded-pill bg-danger px-5 py-2.5 font-semibold text-background disabled:cursor-wait disabled:opacity-70">
          {pending ? t("cancelling") : t("cancelYes")}
        </button>
        <button type="button" onClick={() => setAsking(false)} disabled={pending} className="rounded-pill border border-border-strong bg-surface px-5 py-2.5 font-semibold">
          {t("cancelNo")}
        </button>
      </div>
    </div>
  );
}
