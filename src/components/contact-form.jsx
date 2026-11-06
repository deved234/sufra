"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import { sendContactMessage } from "@/lib/contact/actions";

export default function ContactForm() {
  const t = useTranslations("Contact");
  const locale = useLocale();
  const [state, action] = useActionState(sendContactMessage, {});

  if (state.sent) {
    return (
      <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success">
        {t("sent")}
      </p>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <FormAlert error={state.error} />
      {/* A trap for bots: out of sight and out of the tab order, so only they fill it in */}
      <div aria-hidden className="absolute -start-[9999px] size-px overflow-hidden">
        <label>
          {t("trap")}
          <input type="text" name="leave_empty" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label={t("name")} name="name" autoComplete="name" required maxLength={80} defaultValue={state.values?.name} error={state.errors?.name} />
      <Field label={t("email")} name="email" type="email" dir="ltr" autoComplete="email" required defaultValue={state.values?.email} error={state.errors?.email} />
      <Field as="textarea" label={t("message")} name="message" rows={6} required maxLength={5000} defaultValue={state.values?.message} error={state.errors?.message} />
      <SubmitButton pendingLabel={t("pending")}>{t("submit")}</SubmitButton>
    </form>
  );
}
