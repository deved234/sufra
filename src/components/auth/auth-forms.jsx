"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signIn, signUp } from "@/lib/auth/actions";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";

// useActionState keeps what the server returned (field errors, typed values) so
// the form shows them after a failed submit. On success the action redirects.

export function SignInForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action] = useActionState(signIn, {});

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      {/* Only this hidden field waits for the URL, so the visible fields are never
          swapped out under someone already typing */}
      <Suspense fallback={null}>
        <NextField />
      </Suspense>
      <FormAlert error={state.error} />
      <Field
        label={t("email")}
        name="email"
        type="email"
        dir="ltr"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <Field
        label={t("password")}
        name="password"
        type="password"
        dir="ltr"
        autoComplete="current-password"
        required
        error={state.errors?.password}
      />
      <SubmitButton pendingLabel={t("pending")}>{t("signIn")}</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="font-semibold text-brand-text hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </form>
  );
}

// ?next= is where the visitor was going before being sent to sign in. It lives in
// the URL, which a prerendered page only knows in the browser.
function NextField() {
  const next = useSearchParams().get("next");
  return next ? <input type="hidden" name="next" value={next} /> : null;
}

export function SignUpForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action] = useActionState(signUp, {});

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <FormAlert error={state.error} />
      <Field
        label={t("name")}
        name="name"
        autoComplete="name"
        required
        maxLength={80}
        defaultValue={state.values?.name}
        error={state.errors?.name}
      />
      <Field
        label={t("email")}
        name="email"
        type="email"
        dir="ltr"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <Field
        label={t("password")}
        name="password"
        type="password"
        dir="ltr"
        autoComplete="new-password"
        required
        minLength={8}
        hint={t("passwordHint")}
        error={state.errors?.password}
      />
      <SubmitButton pendingLabel={t("pending")}>{t("signUp")}</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="font-semibold text-brand-text hover:underline">
          {t("goSignIn")}
        </Link>
      </p>
    </form>
  );
}
