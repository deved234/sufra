"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { FormAlert } from "@/components/form/field";
import { startDemo } from "@/lib/demo/actions";

function Press({ className }) {
  const t = useTranslations("Auth");
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted disabled:cursor-wait disabled:opacity-70 ${className}`}>
      {pending ? t("tryDemoPending") : t("tryDemo")}
    </button>
  );
}

export default function TryDemoButton({ className = "" }) {
  const locale = useLocale();
  const [state, action] = useActionState(startDemo, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <FormAlert error={state.error} />
      <Press className={className} />
    </form>
  );
}
