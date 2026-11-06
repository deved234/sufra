"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useViewer } from "@/components/use-viewer";

// The dashboard's frame is static, so whether this is a demo account comes from the browser
export default function DemoBanner() {
  const t = useTranslations("Dashboard");
  const viewer = useViewer();
  if (!viewer?.isDemo) return null;
  return (
    <p role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-brand-soft px-4 py-3 text-sm font-medium text-on-brand-soft">
      <span>{t("demoBanner")}</span>
      <Link href="/for-restaurants/sign-up" className="font-semibold underline">
        {t("demoSignUp")}
      </Link>
    </p>
  );
}
