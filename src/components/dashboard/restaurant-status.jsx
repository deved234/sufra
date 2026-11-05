"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import { deleteRestaurant, setRestaurantStatus } from "@/lib/dashboard/actions";

// Whether people can see the restaurant, on every page of it in the dashboard
export function StatusBar({ slug, status, upcoming, suspendedReason }) {
  const t = useTranslations("Status");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();
  const change = (next) =>
    startTransition(async () => {
      setError(null);
      setAsking(false);
      const result = await setRestaurantStatus(slug, next);
      if (result.error) setError(result.error);
    });

  // The admin's decision, so there's nothing here to press
  if (status === "suspended") {
    return (
      <div role="status" className="flex flex-col gap-1 rounded-lg border border-danger/40 bg-danger-soft p-4 text-danger">
        <p className="font-semibold">{t("suspendedTitle")}</p>
        {suspendedReason && <p className="text-sm">{suspendedReason}</p>}
        <p className="text-sm">{t("suspendedBody")}</p>
      </div>
    );
  }

  if (status === "published") {
    return (
      <div className="flex flex-col gap-2">
        <FormAlert error={error} />
        {asking ? (
          <div role="group" className="flex flex-wrap items-center gap-3 rounded-md bg-surface-muted p-3 text-sm">
            <p className="font-medium">{upcoming > 0 ? t("hideWithBookings", { count: upcoming }) : t("hideConfirm")}</p>
            <button type="button" disabled={pending} onClick={() => change("hidden")} className="rounded-pill bg-foreground px-4 py-2 font-semibold text-background disabled:opacity-70">
              {t("hideYes")}
            </button>
            <button type="button" onClick={() => setAsking(false)} className="rounded-pill border border-border-strong px-4 py-2 font-semibold">
              {t("hideNo")}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-pill bg-success-soft px-3 py-1 font-semibold text-success">{t("published")}</span>
            <button type="button" onClick={() => setAsking(true)} className="font-semibold text-muted-foreground hover:text-foreground hover:underline">
              {t("hide")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FormAlert error={error} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-tint p-4">
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold">{t(status === "draft" ? "draftTitle" : "hiddenTitle")}</p>
          <p className="text-sm text-muted-foreground">{t(status === "draft" ? "draftBody" : "hiddenBody")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/${slug}/preview`} className="rounded-pill border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-muted">
            {t("preview")}
          </Link>
          <button type="button" disabled={pending} onClick={() => change("published")} className="rounded-pill bg-cta px-5 py-2 text-sm font-semibold text-on-cta hover:bg-cta-hover disabled:opacity-70">
            {t(status === "draft" ? "publish" : "show")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeleteRestaurantForm({ slug }) {
  const t = useTranslations("Status");
  const [asking, setAsking] = useState(false);
  const [state, action] = useActionState(deleteRestaurant.bind(null, slug), {});
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-danger/40 bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-h3 font-bold">{t("deleteTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("deleteLead")}</p>
      </div>
      {asking ? (
        <form action={action} noValidate className="flex flex-col gap-4">
          <FormAlert error={state.error} />
          <Field label={t("deleteType", { slug })} name="confirm" dir="ltr" autoComplete="off" spellCheck={false} error={state.errors?.confirm} />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton pendingLabel={t("deleting")} className="bg-danger text-background hover:bg-danger hover:opacity-90">
              {t("deleteConfirm")}
            </SubmitButton>
            <button type="button" onClick={() => setAsking(false)} className="rounded-pill border border-border-strong px-5 py-2.5 font-semibold hover:bg-surface-muted">
              {t("hideNo")}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAsking(true)} className="self-start rounded-pill px-5 py-2.5 font-semibold text-danger transition-colors duration-150 hover:bg-danger-soft">
          {t("deleteButton")}
        </button>
      )}
    </section>
  );
}
