import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import AuthCard from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

// Opened from an email link. The token stays out of the Referer header sent to
// other sites (the site-wide Referrer-Policy sends only the origin).
export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return { title: t("metaReset"), robots: { index: false } };
}

export default function ResetPasswordPage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard title={t("resetTitle")} lead={t("resetLead")}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
