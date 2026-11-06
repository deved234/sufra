import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/i18n/metadata";
import AuthCard, { EntrySwitch } from "@/components/auth/auth-card";
import RedirectIfSignedIn from "@/components/auth/redirect-if-signed-in";
import { googleEnabled } from "@/lib/auth/google";
import { SignUpForm } from "@/components/auth/auth-forms";

export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return { title: t("metaSignUp"), robots: { index: false }, alternates: await alternatesFor("/sign-up") };
}

export default function SignUpPage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard title={t("signUpTitle")} lead={t("signUpLead")}>
      <SignUpForm google={googleEnabled} />
      <EntrySwitch prompt={t("ownerEntryPrompt")} label={t("ownerEntrySignUp")} href="/for-restaurants/sign-up" />
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
    </AuthCard>
  );
}
