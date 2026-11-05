import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// What anyone but an admin gets at /admin: the same as any address that doesn't exist
export default function AdminNotFound() {
  const t = useTranslations("NotFound");
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <span className="font-display text-display font-extrabold text-brand-text" dir="ltr">
        404
      </span>
      <h1 className="font-display text-h2 font-extrabold">{t("heading")}</h1>
      <p className="text-muted-foreground">{t("body")}</p>
      <Link href="/" className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
        {t("back")}
      </Link>
    </main>
  );
}
