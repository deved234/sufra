"use client";

import { useId } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

const inputClass =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus-visible:border-ring aria-invalid:border-danger";

// Label, input, hint and error wired together for screen readers:
// the error is announced with the field (aria-describedby) and marks it invalid.
export function Field({ label, hint, error, className = "", ...input }) {
  const t = useTranslations("Form.errors");
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={inputClass} {...input} />
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {t(error)}
        </p>
      )}
    </div>
  );
}

// Disabled while its form is sending, so a double click can't submit twice
export function SubmitButton({ children, pendingLabel, className = "" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

// A message for the whole form (wrong password, too many attempts...)
export function FormAlert({ error }) {
  const t = useTranslations("Form.errors");
  if (!error) return null;
  return (
    <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
      {t(error)}
    </p>
  );
}
