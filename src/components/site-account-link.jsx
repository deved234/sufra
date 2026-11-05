"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useViewer } from "@/components/use-viewer";

// The visitor's way in, on a restaurant's own site. That site is fully static, so
// the browser asks who is visiting.
export default function SiteAccountLink() {
  const t = useTranslations("Site");
  const viewer = useViewer();
  return (
    <Link
      href={viewer ? "/dashboard" : "/sign-in"}
      className="whitespace-nowrap rounded-pill px-3 py-2 font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground"
    >
      {t(viewer ? "myAccount" : "signIn")}
    </Link>
  );
}
