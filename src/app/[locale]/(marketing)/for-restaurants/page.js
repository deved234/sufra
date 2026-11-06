import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { alternatesFor } from "@/i18n/metadata";

const FEATURES = ["site", "menu", "booking"];
const STEPS = ["account", "details", "publish"];

export async function generateMetadata() {
  const t = await getTranslations("ForRestaurants");
  return { title: t("metaTitle"), description: t("lead"), alternates: await alternatesFor("/for-restaurants") };
}

// The restaurant owners' way in. It only promises what the platform does today.
export default function ForRestaurantsPage() {
  const t = useTranslations("ForRestaurants");
  const actions = (
    <div className="flex flex-wrap gap-3">
      <Link href="/for-restaurants/sign-up" className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover">
        {t("signUp")}
      </Link>
      <Link href="/for-restaurants/sign-in" className="rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted">
        {t("signIn")}
      </Link>
    </div>
  );

  return (
    <>
      <section className="bg-surface-tint">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-24 md:py-32">
          <span className="text-sm font-semibold text-brand-text">{t("eyebrow")}</span>
          <h1 className="max-w-3xl font-display text-h1 font-extrabold md:text-display">{t("title")}</h1>
          <p className="max-w-xl text-lg text-muted-foreground">{t("lead")}</p>
          {actions}
        </div>
      </section>

      <section aria-labelledby="features" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
        <h2 id="features" className="font-display text-h2 font-extrabold">
          {t("featuresTitle")}
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((key) => (
            <li key={key} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
              <h3 className="font-display text-h3 font-bold">{t(`features.${key}.title`)}</h3>
              <p className="text-muted-foreground">{t(`features.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="steps" className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
          <h2 id="steps" className="font-display text-h2 font-extrabold">
            {t("stepsTitle")}
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((key, index) => (
              <li key={key} className="flex flex-col gap-2">
                <span aria-hidden className="flex size-9 items-center justify-center rounded-pill bg-brand-soft font-bold text-on-brand-soft">
                  {index + 1}
                </span>
                <h3 className="font-semibold">{t(`steps.${key}.title`)}</h3>
                <p className="text-muted-foreground">{t(`steps.${key}.body`)}</p>
              </li>
            ))}
          </ol>
          {actions}
        </div>
      </section>
    </>
  );
}
