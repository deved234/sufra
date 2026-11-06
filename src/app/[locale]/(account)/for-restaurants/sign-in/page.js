import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/i18n/metadata";
import AuthCard, { EntrySwitch } from "@/components/auth/auth-card";
import RedirectIfSignedIn from "@/components/auth/redirect-if-signed-in";
import { googleEnabled } from "@/lib/auth/google";
import { OWNER_NEXT } from "@/lib/auth/next-path";
import { SignInForm } from "@/components/auth/auth-forms";

export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return { title: t("ownerSignInTitle"), robots: { index: false }, alternates: await alternatesFor("/for-restaurants/sign-in") };
}

// The same accounts as /sign-in. Only the words and where it continues to differ.
export default function OwnerSignInPage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard title={t("ownerSignInTitle")} lead={t("ownerSignInLead")}>
      <SignInForm google={googleEnabled} next={OWNER_NEXT} signUpHref="/for-restaurants/sign-up" />
      <EntrySwitch prompt={t("customerEntryPrompt")} label={t("customerEntryLink")} href="/sign-in" />
      <Suspense fallback={null}>
        <RedirectIfSignedIn next={OWNER_NEXT} />
      </Suspense>
    </AuthCard>
  );
}
