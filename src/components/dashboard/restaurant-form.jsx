"use client";

import { useActionState, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import ThemePreview from "@/components/dashboard/theme-preview";

const empty = { ar: "", en: "" };

// One form for creating and editing a restaurant. `action` is a Server Action;
// for editing it's already bound to the restaurant's slug.
// Owner text is asked in both languages side by side, each input in its own
// direction so Arabic types right to left and English left to right.
export default function RestaurantForm({ action, initial, initialThemeStyle, mode }) {
  const t = useTranslations("Dashboard");
  const errorsT = useTranslations("Form");
  const locale = useLocale();
  const [state, formAction] = useActionState(action, { values: initial });
  const values = state.values ?? initial;
  const errors = state.errors ?? {};
  const [accent, setAccent] = useState(values.accent);

  const localized = (field, extra) => (
    <LocalizedField
      label={t(`fields.${field}`)}
      name={field}
      value={values[field] ?? empty}
      errors={{ ar: errors[`${field}.ar`], en: errors[`${field}.en`] }}
      {...extra}
    />
  );

  return (
    // key: after a save, the inputs restart from the saved values
    <form key={state.saved ?? "form"} action={formAction} noValidate className="flex flex-col gap-8">
      <input type="hidden" name="locale" value={locale} />

      {Object.keys(errors).length > 0 && (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {errorsT("summary")}
        </p>
      )}
      <FormAlert error={state.error} />
      {state.saved && (
        <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success">
          {t("saved")}
        </p>
      )}

      <Section title={t("sections.basics")}>
        {localized("name", { maxLength: 60 })}
        <Field
          label={t("fields.slug")}
          name="slug"
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          // The address is isolated so its slashes keep their order inside Arabic text
          hint={t.rich("fields.slugHint", { path: (chunks) => <bdi dir="ltr">{chunks}</bdi> })}
          defaultValue={values.slug}
          error={errors.slug}
          // Fixed after creation: public links and QR codes point at it
          disabled={mode === "edit"}
        />
      </Section>

      <Section title={t("sections.details")}>
        {localized("tagline", { maxLength: 160 })}
        {localized("cuisine", { maxLength: 40 })}
        {localized("city", { maxLength: 40 })}
        {localized("address", { maxLength: 120 })}
      </Section>

      <Section title={t("sections.contact")}>
        <Field
          label={t("fields.phone")}
          name="phone"
          type="tel"
          dir="ltr"
          autoComplete="tel"
          placeholder="+966 11 234 5678"
          defaultValue={values.phone}
          error={errors.phone}
        />
        {mode !== "edit" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.opens")} name="opens" type="time" dir="ltr" defaultValue={values.opens} error={errors.opens} />
              <Field label={t("fields.closes")} name="closes" type="time" dir="ltr" defaultValue={values.closes} error={errors.closes} />
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">{t("fields.timesHint")}</p>
          </>
        )}
      </Section>

      <Section title={t("sections.look")}>
        <div className="grid items-start gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-3">
              <input
                type="color"
                aria-label={t("fields.accent")}
                value={/^#[0-9A-Fa-f]{6}$/.test(accent) ? accent : "#000000"}
                onChange={(event) => setAccent(event.target.value.toUpperCase())}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-md border border-border-strong bg-surface p-1"
              />
              <Field
                label={t("fields.accent")}
                name="accent"
                dir="ltr"
                spellCheck={false}
                maxLength={7}
                value={accent}
                onChange={(event) => setAccent(event.target.value.trim())}
                error={errors.accent}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("fields.accentHint")}</p>
          </div>
          <ThemePreview accent={accent} initialStyle={initialThemeStyle} />
        </div>
      </Section>

      <SubmitButton pendingLabel={`${t(mode === "edit" ? "save" : "create")}…`} className="self-start">
        {t(mode === "edit" ? "save" : "create")}
      </SubmitButton>
    </form>
  );
}

function Section({ title, children }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:p-6">
      <legend className="px-1 font-display text-h3 font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

// Arabic and English versions of one piece of text, grouped under one label
function LocalizedField({ label, name, value, errors, maxLength }) {
  const t = useTranslations("Dashboard");
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <span id={id} className="text-sm font-semibold">
        {label}
      </span>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("langAr")} name={`${name}.ar`} lang="ar" dir="rtl" maxLength={maxLength} defaultValue={value.ar} error={errors.ar} />
        <Field label={t("langEn")} name={`${name}.en`} lang="en" dir="ltr" maxLength={maxLength} defaultValue={value.en} error={errors.en} />
      </div>
    </div>
  );
}
