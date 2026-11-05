"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import { DURATIONS, formatDate } from "@/lib/booking-slots";

// Booking is the restaurant's choice: off until the owner turns it on, and only then
// are the numbers asked for. The seat count is left empty, because only the owner
// knows it; a ready-made number would quietly be wrong.
export default function BookingSettingsForm({ action, initial }) {
  const t = useTranslations("Bookings");
  const locale = useLocale();
  const [state, formAction] = useActionState(action, { values: initial });
  const values = state.values ?? initial;
  const errors = state.errors ?? {};
  const [enabled, setEnabled] = useState(values.enabled);

  return (
    <form key={state.saved ?? "form"} id="booking" action={formAction} noValidate className="scroll-mt-24">
      <fieldset className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:p-6">
        <legend className="px-1 font-display text-h3 font-bold">{t("settingsTitle")}</legend>
        <p className="-mt-1 text-sm text-muted-foreground">{t("settingsLead")}</p>
        <FormAlert error={state.error} />
        {state.saved && (
          <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success">
            {t("settingsSaved")}
          </p>
        )}
        {state.overbooked?.length > 0 && (
          <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {t("overbooked", { days: state.overbooked.map((date) => formatDate(date, locale, { day: "numeric", month: "short" })).join(locale === "ar" ? "، " : ", ") })}
          </p>
        )}
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" name="enabled" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="size-4 accent-brand" />
          {t("enabled")}
        </label>
        {enabled ? (
          <div className="grid items-start gap-4 sm:grid-cols-3">
            <Field label={t("capacity")} name="capacity" type="number" min={1} max={1000} dir="ltr" required hint={t("capacityHint")} defaultValue={values.capacity} error={errors.capacity} />
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t("duration")}
              <select name="durationMinutes" defaultValue={values.durationMinutes} className="w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 font-normal text-foreground focus-visible:border-ring">
                {DURATIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {t("minutes", { count: minutes })}
                  </option>
                ))}
              </select>
            </label>
            <Field label={t("maxParty")} name="maxParty" type="number" min={1} max={100} dir="ltr" required defaultValue={values.maxParty} error={errors.maxParty} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("disabledHint")}</p>
        )}
        <SubmitButton pendingLabel={`${t("saveSettings")}…`} className="self-start">
          {t("saveSettings")}
        </SubmitButton>
      </fieldset>
    </form>
  );
}
