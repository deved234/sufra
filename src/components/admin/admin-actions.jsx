"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";

// A button for a one-step action. A second press is needed to confirm, because these
// act on someone else's account or restaurant.
export function ConfirmAction({ action, label, doneLabel, danger = false }) {
  const t = useTranslations("Admin");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const run = () =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      setAsking(false);
      if (result.error) setError(result.error);
      else setDone(true);
    });

  const base = "rounded-pill px-4 py-2 text-sm font-semibold transition-colors duration-150 disabled:opacity-70";
  return (
    <div className="flex flex-col items-start gap-2">
      <FormAlert error={error} />
      {done && doneLabel && (
        <p role="status" className="text-sm font-medium text-success">
          {doneLabel}
        </p>
      )}
      {asking ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={pending} onClick={run} className={`${base} ${danger ? "bg-danger text-background" : "bg-cta text-on-cta"}`}>
            {t("confirm", { action: label })}
          </button>
          <button type="button" onClick={() => setAsking(false)} className={`${base} border border-border-strong hover:bg-surface-muted`}>
            {t("cancel")}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAsking(true)} className={`${base} ${danger ? "text-danger hover:bg-danger-soft" : "border border-border-strong hover:bg-surface-muted"}`}>
          {label}
        </button>
      )}
    </div>
  );
}

// Suspending needs a reason: the owner reads it, and it stays in the log
export function ReasonAction({ action, label }) {
  const t = useTranslations("Admin");
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, {});
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-pill px-4 py-2 text-sm font-semibold text-danger transition-colors duration-150 hover:bg-danger-soft">
        {label}
      </button>
    );
  }
  return (
    <form action={formAction} noValidate className="flex w-full flex-col gap-3 rounded-md border border-danger/40 p-4">
      <FormAlert error={state.error} />
      <Field as="textarea" rows={2} label={t("reason")} name="reason" required maxLength={200} hint={t("reasonHint")} error={state.errors?.reason} />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pendingLabel={t("working")} className="bg-danger text-background hover:bg-danger hover:opacity-90">
          {label}
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="rounded-pill border border-border-strong px-5 py-2.5 font-semibold hover:bg-surface-muted">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

export function TransferForm({ action }) {
  const t = useTranslations("Admin");
  const [state, formAction] = useActionState(action, {});
  return (
    <form key={state.done ?? "form"} action={formAction} noValidate className="flex flex-col gap-3">
      <FormAlert error={state.error} />
      {state.done && (
        <p role="status" className="text-sm font-medium text-success">
          {t("transferred")}
        </p>
      )}
      <Field label={t("newOwnerEmail")} name="email" type="email" dir="ltr" required hint={t("newOwnerHint")} defaultValue={state.values?.email} error={state.errors?.email} />
      <SubmitButton pendingLabel={t("working")} className="self-start">
        {t("transfer")}
      </SubmitButton>
    </form>
  );
}
