"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Field, FormAlert, SubmitButton } from "@/components/form/field";
import {
  changePassword,
  confirmEmailChange,
  deleteAccount,
  requestEmailChange,
  sendSetPasswordLink,
  signOutOtherDevices,
  updateProfile,
} from "@/lib/account/actions";

function Card({ title, lead, children, danger }) {
  return (
    <section className={`flex flex-col gap-4 rounded-lg border bg-surface p-5 sm:p-6 ${danger ? "border-danger/40" : "border-border"}`}>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-h3 font-bold">{title}</h2>
        {lead && <p className="text-sm text-muted-foreground">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

function Saved({ children }) {
  return (
    <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success">
      {children}
    </p>
  );
}

export function ProfileForm({ initial }) {
  const t = useTranslations("Account");
  const [state, action] = useActionState(updateProfile, { values: initial });
  const values = state.values ?? initial;
  const errors = state.errors ?? {};
  return (
    <Card title={t("profileTitle")}>
      <form key={state.saved ?? "form"} action={action} noValidate className="flex flex-col gap-4">
        <FormAlert error={state.error} />
        {state.saved && <Saved>{t("saved")}</Saved>}
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <Field label={t("name")} name="name" required maxLength={80} autoComplete="name" defaultValue={values.name} error={errors.name} />
          <Field label={t("phone")} name="phone" type="tel" dir="ltr" autoComplete="tel" placeholder="0512345678" hint={t("phoneHint")} defaultValue={values.phone} error={errors.phone} />
        </div>
        <SubmitButton pendingLabel={t("saving")} className="self-start">
          {t("save")}
        </SubmitButton>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const t = useTranslations("Account");
  const [state, action] = useActionState(changePassword, {});
  const errors = state.errors ?? {};
  return (
    <Card title={t("passwordTitle")} lead={t("passwordLead")}>
      <form key={state.saved ?? "form"} action={action} noValidate className="flex flex-col gap-4">
        <FormAlert error={state.error} />
        {state.saved && <Saved>{t("passwordSaved")}</Saved>}
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <Field label={t("currentPassword")} name="current" type="password" dir="ltr" autoComplete="current-password" required error={errors.current} />
          <Field label={t("newPassword")} name="next" type="password" dir="ltr" autoComplete="new-password" required minLength={8} hint={t("passwordHint")} error={errors.next} />
        </div>
        <SubmitButton pendingLabel={t("saving")} className="self-start">
          {t("changePassword")}
        </SubmitButton>
      </form>
    </Card>
  );
}

export function SetPasswordLink() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [state, action] = useActionState(sendSetPasswordLink, {});
  return (
    <Card title={t("passwordTitle")} lead={t("noPasswordLead")}>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <FormAlert error={state.error} />
        {state.sent && <Saved>{t("linkSent")}</Saved>}
        <SubmitButton pendingLabel={t("saving")} className="self-start">
          {t("sendPasswordLink")}
        </SubmitButton>
      </form>
    </Card>
  );
}

export function EmailForm({ email, hasPassword, googleLinked }) {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [state, action] = useActionState(requestEmailChange, {});
  const errors = state.errors ?? {};
  return (
    <Card title={t("emailTitle")} lead={t("emailLead")}>
      <p className="text-sm">
        {t("currentEmail")} <bdi dir="ltr" className="font-semibold">{email}</bdi>
      </p>
      <p className="text-sm text-muted-foreground">{t(googleLinked ? "googleLinked" : "googleNotLinked")}</p>
      <form action={action} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <FormAlert error={state.error} />
        {state.sent && <Saved>{t("emailSent", { email: state.sent })}</Saved>}
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <Field label={t("newEmail")} name="email" type="email" dir="ltr" autoComplete="email" required defaultValue={state.values?.email} error={errors.email} />
          {hasPassword && <Field label={t("currentPassword")} name="password" type="password" dir="ltr" autoComplete="current-password" required error={errors.password} />}
        </div>
        <SubmitButton pendingLabel={t("saving")} className="self-start">
          {t("changeEmail")}
        </SubmitButton>
      </form>
    </Card>
  );
}

export function DevicesForm() {
  const t = useTranslations("Account");
  const [state, action] = useActionState(signOutOtherDevices, {});
  return (
    <Card title={t("devicesTitle")} lead={t("devicesLead")}>
      <form action={action} className="flex flex-col gap-4">
        <FormAlert error={state.error} />
        {state.done && <Saved>{t("devicesDone")}</Saved>}
        <SubmitButton pendingLabel={t("saving")} className="self-start">
          {t("devicesButton")}
        </SubmitButton>
      </form>
    </Card>
  );
}

export function DeleteAccountForm({ email, hasPassword, ownedCount }) {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [asking, setAsking] = useState(false);
  const [state, action] = useActionState(deleteAccount, {});
  const errors = state.errors ?? {};

  return (
    <Card title={t("deleteTitle")} lead={t("deleteLead")} danger>
      {ownedCount > 0 ? (
        <p className="text-sm font-medium">{t("deleteOwner", { count: ownedCount })}</p>
      ) : !asking ? (
        <button type="button" onClick={() => setAsking(true)} className="self-start rounded-pill px-5 py-2.5 font-semibold text-danger transition-colors duration-150 hover:bg-danger-soft">
          {t("deleteButton")}
        </button>
      ) : (
        <form action={action} noValidate className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <FormAlert error={state.error} />
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field label={t("deleteTypeEmail", { email })} name="email" type="email" dir="ltr" autoComplete="off" required error={errors.email} />
            {hasPassword && <Field label={t("currentPassword")} name="password" type="password" dir="ltr" autoComplete="current-password" required error={errors.password} />}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DeleteSubmit />
            <button type="button" onClick={() => setAsking(false)} className="rounded-pill border border-border-strong px-5 py-2.5 font-semibold hover:bg-surface-muted">
              {t("deleteCancel")}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

function DeleteSubmit() {
  const t = useTranslations("Account");
  return (
    <SubmitButton pendingLabel={t("saving")} className="bg-danger text-background hover:bg-danger hover:opacity-90">
      {t("deleteConfirm")}
    </SubmitButton>
  );
}

// The button on the page an email-change link opens
export function ConfirmEmailChangeForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action] = useActionState(confirmEmailChange, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <Suspense fallback={null}>
        <TokenField />
      </Suspense>
      <FormAlert error={state.error} />
      <SubmitButton pendingLabel={t("pending")}>{t("confirmChangeSubmit")}</SubmitButton>
    </form>
  );
}

function TokenField() {
  const token = useSearchParams().get("token");
  return token ? <input type="hidden" name="token" value={token} /> : null;
}
