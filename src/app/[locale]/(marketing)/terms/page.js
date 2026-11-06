import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/i18n/metadata";
import LegalPage from "@/components/legal-page";

export async function generateMetadata() {
  const t = await getTranslations("Terms");
  return { title: t("title"), description: t("lead"), alternates: await alternatesFor("/terms") };
}

export default function TermsPage() {
  return <LegalPage namespace="Terms" />;
}
