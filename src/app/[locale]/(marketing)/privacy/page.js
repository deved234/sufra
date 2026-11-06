import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/i18n/metadata";
import LegalPage from "@/components/legal-page";

export async function generateMetadata() {
  const t = await getTranslations("Privacy");
  return { title: t("title"), description: t("lead"), alternates: await alternatesFor("/privacy") };
}

export default function PrivacyPage() {
  return <LegalPage namespace="Privacy" />;
}
