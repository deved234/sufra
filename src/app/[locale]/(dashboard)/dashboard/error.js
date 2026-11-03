"use client";

import { useTranslations } from "next-intl";

// A failure inside the dashboard keeps the dashboard frame (header, sign out)
// instead of falling through to the site-wide error page
export default function DashboardError({ retry }) {
  const t = useTranslations("Form.errors");
  const dashboard = useTranslations("Dashboard");
  return (
    <section role="alert" className="flex flex-col items-start gap-4 py-10">
      <h1 className="font-display text-h2 font-extrabold">{t("generic")}</h1>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
      >
        {dashboard("retry")}
      </button>
    </section>
  );
}
