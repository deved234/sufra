import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/i18n/metadata";
import AuthCard, { EntrySwitch } from "@/components/auth/auth-card";
import RedirectIfSignedIn from "@/components/auth/redirect-if-signed-in";
import { googleEnabled } from "@/lib/auth/google";
import { OWNER_NEXT } from "@/lib/auth/next-path";
import { SignUpForm } from "@/components/auth/auth-forms";

export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return { title: t("ownerSignUpTitle"), robots: { index: false }, alternates: await alternatesFor("/for-restaurants/sign-up") };
}

// The same accounts as /sign-up. Confirming the email continues to creating a restaurant.
export default function OwnerSignUpPage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard title={t("ownerSignUpTitle")} lead={t("ownerSignUpLead")}>
      <SignUpForm google={googleEnabled} next={OWNER_NEXT} signInHref="/for-restaurants/sign-in" />
      <EntrySwitch prompt={t("customerEntryPrompt")} label={t("customerEntryLink")} href="/sign-up" />
      <Suspense fallback={null}>
        <RedirectIfSignedIn next={OWNER_NEXT} />
      </Suspense>
    </AuthCard>
  );
}
