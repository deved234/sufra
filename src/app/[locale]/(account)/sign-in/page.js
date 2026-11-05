import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/i18n/metadata";
import AuthCard from "@/components/auth/auth-card";
import RedirectIfSignedIn from "@/components/auth/redirect-if-signed-in";
import { googleEnabled } from "@/lib/auth/google";
import { SignInForm } from "@/components/auth/auth-forms";

export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return { title: t("metaSignIn"), robots: { index: false }, alternates: await alternatesFor("/sign-in") };
}

export default function SignInPage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard title={t("signInTitle")} lead={t("signInLead")}>
      <SignInForm google={googleEnabled} />
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
    </AuthCard>
  );
}
