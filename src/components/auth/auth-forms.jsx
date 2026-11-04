"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { confirmEmail, requestPasswordReset, resendVerification, resetPassword, signIn, signUp } from "@/lib/auth/actions";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import GoogleSignIn from "@/components/auth/google-sign-in";

// useActionState keeps what the server returned (field errors, typed values) so
// the form shows them after a failed submit. On success the action redirects.

export function SignInForm({ google }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action] = useActionState(signIn, {});

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      {/* Only this hidden field waits for the URL, so the visible fields are never
          swapped out under someone already typing */}
      <Suspense fallback={null}>
        <SearchParamField name="next" />
      </Suspense>
      {state.error ? (
        <FormAlert error={state.error} />
      ) : (
        <Suspense fallback={null}>
          <GoogleError />
        </Suspense>
      )}
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
      <Link href="/forgot-password" className="-mt-3 self-end text-sm font-medium text-brand-text hover:underline">
        {t("forgotLink")}
      </Link>
      <SubmitButton pendingLabel={t("pending")}>{t("signIn")}</SubmitButton>
      {google && <GoogleSignIn />}
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="font-semibold text-brand-text hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </form>
  );
}

// Copies a URL parameter into the form: ?next= (where the visitor was going before
// being sent to sign in) or ?token= (from an email link). The URL is only known in
// the browser on a prerendered page, so this waits behind Suspense.
function SearchParamField({ name }) {
  const value = useSearchParams().get(name);
  return value ? <input type="hidden" name={name} value={value} /> : null;
}

// The Google callback sends people back here with ?error= when sign-in didn't work
const GOOGLE_ERRORS = ["googleFailed", "googleCancelled"];
function GoogleError() {
  const error = useSearchParams().get("error");
  return GOOGLE_ERRORS.includes(error) ? <FormAlert error={error} /> : null;
}

export function SignUpForm({ google }) {
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
      {google && <GoogleSignIn />}
      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="font-semibold text-brand-text hover:underline">
          {t("goSignIn")}
        </Link>
      </p>
    </form>
  );
}

// "Confirm my email" on the page an email link opens. Pressing it (a POST) is what
// uses the link, never just opening the page.
export function ConfirmEmailForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action] = useActionState(confirmEmail, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <Suspense fallback={null}>
        <SearchParamField name="token" />
      </Suspense>
      <LinkProblem error={state.error} href="/verify-email" />
      <SubmitButton pendingLabel={t("pending")}>{t("confirmSubmit")}</SubmitButton>
    </form>
  );
}

export function ResendVerificationForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action] = useActionState(resendVerification, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <FormAlert error={state.error} />
      {state.sent && (
        <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success">
          {t("resent")}
        </p>
      )}
      <SubmitButton pendingLabel={t("pending")}>{t("resend")}</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action] = useActionState(requestPasswordReset, {});

  // The same answer whether or not the email has an account
  if (state.sent) {
    return (
      <div className="flex flex-col gap-5">
        <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success">
          {t("forgotSent")}
        </p>
        <BackToSignIn />
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
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
      <SubmitButton pendingLabel={t("pending")}>{t("forgotSubmit")}</SubmitButton>
      <BackToSignIn />
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action] = useActionState(resetPassword, {});

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <Suspense fallback={null}>
        <SearchParamField name="token" />
      </Suspense>
      <LinkProblem error={state.error} href="/forgot-password" />
      <Field
        label={t("newPassword")}
        name="password"
        type="password"
        dir="ltr"
        autoComplete="new-password"
        required
        minLength={8}
        hint={t("passwordHint")}
        error={state.errors?.password}
      />
      <SubmitButton pendingLabel={t("pending")}>{t("resetSubmit")}</SubmitButton>
    </form>
  );
}

// An expired or used link: say so, and point to where a new one comes from
function LinkProblem({ error, href }) {
  const t = useTranslations("Auth");
  if (!error) return null;
  return (
    <div className="flex flex-col gap-2">
      <FormAlert error={error} />
      {error === "linkInvalid" && (
        <Link href={href} className="text-sm font-semibold text-brand-text hover:underline">
          {t("requestNewLink")}
        </Link>
      )}
    </div>
  );
}

function BackToSignIn() {
  const t = useTranslations("Auth");
  return (
    <Link href="/sign-in" className="text-center text-sm font-semibold text-brand-text hover:underline">
      {t("backToSignIn")}
    </Link>
  );
}
