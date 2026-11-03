import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { alternatesFor } from "@/i18n/metadata";

export async function generateMetadata() {
  return { alternates: await alternatesFor("/") };
}

// Starter landing page: the hero only. The full landing page comes in its own phase.
export default function HomePage() {
  const t = useTranslations("Home");
  const site = useTranslations("Site");

  return (
    <section className="bg-surface-tint">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-24 md:py-32">
        <span className="text-sm font-semibold text-brand-text">{t("eyebrow")}</span>
        <h1 className="max-w-3xl font-display text-h1 font-extrabold md:text-display">{t("title")}</h1>
        <p className="max-w-xl text-lg text-muted-foreground">{t("lead")}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/sign-up"
            className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
          >
            {site("startFree")}
          </Link>
          <Link
            href="/r/bait-alkabsa"
            className="rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted"
          >
            {t("liveExample")}
          </Link>
        </div>
      </div>
    </section>
  );
}
