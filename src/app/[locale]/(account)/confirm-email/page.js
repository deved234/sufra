import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import AuthCard from "@/components/auth/auth-card";
import { ConfirmEmailForm } from "@/components/auth/auth-forms";

// Opened from the confirmation email. Showing the page changes nothing; the button does.
export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return { title: t("metaConfirm"), robots: { index: false } };
}

export default function ConfirmEmailPage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard title={t("confirmTitle")} lead={t("confirmLead")}>
      <ConfirmEmailForm />
    </AuthCard>
  );
}
