"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import { BADGES, TAGS } from "@/lib/validation/menu";

// A native modal <dialog>: focus stays inside, Escape closes it, and the browser
// returns focus to the button that opened it.
export function Modal({ title, onClose, children }) {
  const t = useTranslations("MenuEditor");
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      // The close event arrives a moment after close(). In development React runs
      // effects twice (open, close, open) to catch missing cleanups, so the event from
      // that test close arrives while the dialog is open again: only a dialog that is
      // really closed counts.
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[min(36rem,calc(100%-2rem))] overflow-y-auto rounded-lg border border-border bg-surface p-0 text-foreground shadow-lg backdrop:bg-black/55"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <h2 className="font-display text-h3 font-bold">{title}</h2>
        <button
          type="button"
          onClick={() => ref.current.close()}
          aria-label={t("close")}
          className="flex size-9 items-center justify-center rounded-pill hover:bg-surface-muted"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

// Closes the dialog once the action reports success (state.done changes)
function useCloseOnDone(state, onDone) {
  const handled = useRef(state.done);
  useEffect(() => {
    if (state.done && state.done !== handled.current) {
      handled.current = state.done;
      onDone();
    }
  }, [state.done, onDone]);
}

function LocalizedInputs({ name, label, values, errors, multiline, maxLength }) {
  const t = useTranslations("Dashboard");
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {["ar", "en"].map((lang) => (
          <Field
            key={lang}
            as={multiline ? "textarea" : "input"}
            rows={multiline ? 3 : undefined}
            label={t(lang === "ar" ? "langAr" : "langEn")}
            name={`${name}.${lang}`}
            lang={lang}
            dir={lang === "ar" ? "rtl" : "ltr"}
            maxLength={maxLength}
            defaultValue={values?.[lang]}
            error={errors[`${name}.${lang}`]}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function CategoryForm({ action, initial, onDone }) {
  const t = useTranslations("MenuEditor");
  const [state, formAction] = useActionState(action, { values: initial });
  useCloseOnDone(state, onDone);
  const values = state.values ?? initial;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FormAlert error={state.error} />
      <LocalizedInputs name="name" label={t("categoryName")} values={values?.name} errors={state.errors ?? {}} maxLength={40} />
      <SubmitButton pendingLabel={`${t("save")}…`} className="self-start">
        {initial ? t("save") : t("add")}
      </SubmitButton>
    </form>
  );
}

const selectClass =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-foreground focus-visible:border-ring";

export function DishForm({ action, initial, categories, locale, onDone }) {
  const t = useTranslations("MenuEditor");
  const menuT = useTranslations("Menu");
  const [state, formAction] = useActionState(action, { values: initial });
  useCloseOnDone(state, onDone);
  const values = state.values ?? initial;
  const errors = state.errors ?? {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FormAlert error={state.error} />
      <LocalizedInputs name="name" label={t("dishName")} values={values.name} errors={errors} maxLength={60} />
      <LocalizedInputs name="description" label={t("description")} values={values.description} errors={errors} multiline maxLength={200} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("price")}
          name="price"
          inputMode="decimal"
          dir="ltr"
          placeholder="45.50"
          defaultValue={values.price}
          error={errors.price}
        />
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t("category")}
          <select name="categoryId" defaultValue={values.categoryId} className={`${selectClass} font-normal`}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name[locale]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">{t("badge")}</legend>
        <div className="flex flex-wrap gap-4">
          {["", ...BADGES].map((badge) => (
            <label key={badge || "none"} className="flex items-center gap-2 text-sm">
              <input type="radio" name="badge" value={badge} defaultChecked={(values.badge ?? "") === badge} className="size-4 accent-brand" />
              {badge ? menuT(`badges.${badge}`) : t("noBadge")}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">{t("tags")}</legend>
        <div className="flex flex-wrap gap-4">
          {TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="tags" value={tag} defaultChecked={values.tags?.includes(tag)} className="size-4 accent-brand" />
              {menuT(`tags.${tag}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="available" defaultChecked={values.available !== false} className="size-4 accent-brand" />
        {t("available")}
      </label>

      <SubmitButton pendingLabel={`${t("save")}…`} className="self-start">
        {initial.name.ar ? t("save") : t("add")}
      </SubmitButton>
    </form>
  );
}

export function ConfirmDialog({ title, message, onConfirm, onClose }) {
  const t = useTranslations("MenuEditor");
  return (
    <Modal title={title} onClose={onClose}>
      <p>{message}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("cannotUndo")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-pill bg-danger px-6 py-2.5 font-semibold text-background transition-opacity duration-150 hover:opacity-90"
        >
          {t("delete")}
        </button>
        <button type="button" onClick={onClose} className="rounded-pill border border-border-strong px-6 py-2.5 font-semibold hover:bg-surface-muted">
          {t("cancel")}
        </button>
      </div>
    </Modal>
  );
}
