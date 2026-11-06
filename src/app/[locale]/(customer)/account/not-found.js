import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// A booking that doesn't exist, or belongs to someone else: the same answer for both
export default function AccountNotFound() {
  const t = useTranslations("Dashboard");
  const errors = useTranslations("Form.errors");
  return (
    <section className="flex flex-col items-start gap-4 py-10">
      <h1 className="font-display text-h2 font-extrabold">{errors("notFound")}</h1>
      <Link href="/account" className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
        {t("backToAccount")}
      </Link>
    </section>
  );
}
