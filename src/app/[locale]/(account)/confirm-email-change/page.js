import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import AuthCard from "@/components/auth/auth-card";
import { ConfirmEmailChangeForm } from "@/components/account/account-forms";

// Opened from the email sent to the new address. Showing the page changes nothing;
// the button does, so mail scanners opening links can't make the change.
export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return { title: t("confirmChangeTitle"), robots: { index: false } };
}

export default function ConfirmEmailChangePage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard title={t("confirmChangeTitle")} lead={t("confirmChangeLead")}>
      <ConfirmEmailChangeForm />
    </AuthCard>
  );
}
