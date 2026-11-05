"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

// Where a deleted account lands: the home page is static, so the browser reads the URL
export default function AccountDeletedNotice() {
  const t = useTranslations("Site");
  if (!useSearchParams().has("accountDeleted")) return null;
  return (
    <p role="status" className="bg-success-soft px-6 py-3 text-center text-sm font-medium text-success">
      {t("accountDeleted")}
    </p>
  );
}
