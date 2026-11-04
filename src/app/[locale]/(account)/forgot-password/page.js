import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/i18n/metadata";
import AuthCard from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return { title: t("metaForgot"), robots: { index: false }, alternates: await alternatesFor("/forgot-password") };
}

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard title={t("forgotTitle")} lead={t("forgotLead")}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
