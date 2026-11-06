"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useViewer } from "@/components/use-viewer";

// The account end of the site header. It starts as the signed-out links, which is
// right for most visitors and works before any JavaScript loads, and changes once
// the browser knows someone is signed in, to where that account does its work.
export default function AccountLinks({ onNavigate, className = "" }) {
  const t = useTranslations("Site");
  const viewer = useViewer();
  const cta = "whitespace-nowrap rounded-pill bg-cta px-5 py-2 text-sm font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover";

  if (viewer) {
    const [href, label] = viewer.isAdmin ? ["/admin", "adminPanel"] : viewer.isOwner ? ["/dashboard", "myRestaurants"] : ["/account", "myAccount"];
    return (
      <div className={className}>
        <Link href={href} onClick={onNavigate} className={cta}>
          {t(label)}
        </Link>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Link
        href="/sign-in"
        onClick={onNavigate}
        className="whitespace-nowrap rounded-pill px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground"
      >
        {t("signIn")}
      </Link>
      <Link href="/sign-up" onClick={onNavigate} className={cta}>
        {t("signUp")}
      </Link>
    </div>
  );
}
