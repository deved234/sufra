"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import { DURATIONS } from "@/lib/booking-slots";

// The restaurant's booking switch and limits, under the settings form
export default function BookingSettingsForm({ action, initial }) {
  const t = useTranslations("Bookings");
  const [state, formAction] = useActionState(action, { values: initial });
  const values = state.values ?? initial;
  const errors = state.errors ?? {};

  return (
    <form key={state.saved ?? "form"} action={formAction} noValidate>
      <fieldset className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:p-6">
        <legend className="px-1 font-display text-h3 font-bold">{t("settingsTitle")}</legend>
        <FormAlert error={state.error} />
        {state.saved && (
          <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success">
            {t("settingsSaved")}
          </p>
        )}
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" name="enabled" defaultChecked={values.enabled} className="size-4 accent-brand" />
          {t("enabled")}
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("capacity")} name="capacity" type="number" min={1} max={1000} dir="ltr" hint={t("capacityHint")} defaultValue={values.capacity} error={errors.capacity} />
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
          <Field label={t("maxParty")} name="maxParty" type="number" min={1} max={100} dir="ltr" defaultValue={values.maxParty} error={errors.maxParty} />
        </div>
        <SubmitButton pendingLabel={`${t("saveSettings")}…`} className="self-start">
          {t("saveSettings")}
        </SubmitButton>
      </fieldset>
    </form>
  );
}
