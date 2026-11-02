"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Unknown dish (/r/[slug]/dish/nope). It sits inside the restaurant layout, so the
// restaurant's header stays. An unknown restaurant is caught one level up, in r/.
// Client Component only to read the slug: not-found files receive no params.
export default function DishNotFound() {
  const t = useTranslations("Dish");
  const { slug } = useParams();

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-24 text-center">
      <title>{t("notFoundTitle")}</title>
      <span className="font-display text-display font-extrabold text-brand-text" dir="ltr">
        404
      </span>
      <h1 className="font-display text-h2 font-extrabold">{t("notFoundHeading")}</h1>
      <p className="text-muted-foreground">{t("notFoundBody")}</p>
      <Link
        href={`/r/${slug}#menu`}
        className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
      >
        {t("backToMenu")}
      </Link>
    </section>
  );
}
