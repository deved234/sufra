"use client";

import { useTranslations } from "next-intl";

// Error boundaries are Client Components: they catch errors in the browser
// and the retry button needs an onClick. The restaurant header stays visible.
export default function RestaurantError({ retry }) {
  const t = useTranslations("Restaurant");

  return (
    <section role="alert" className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-24 text-center">
      <h1 className="font-display text-h2 font-extrabold">{t("errorHeading")}</h1>
      <p className="text-muted-foreground">{t("errorBody")}</p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
      >
        {t("retry")}
      </button>
    </section>
  );
}
