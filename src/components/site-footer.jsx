import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/logo";
import { aboutLinks, siteLinks } from "@/components/site-nav";

// With Cache Components, reading the clock during prerender is not allowed.
// Caching the result makes it part of the static shell, refreshed daily.
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export default async function SiteFooter() {
  const t = await getTranslations("Site");

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col items-start gap-4">
          <Logo size="lg" gap="var(--surface)" />
          <p className="max-w-xs text-muted-foreground">{t("footerTagline")}</p>
        </div>

        <nav aria-label={t("footerNav")} className="flex flex-wrap gap-x-16 gap-y-8">
          {[
            { title: t("footerLinks"), links: siteLinks },
            { title: t("footerAbout"), links: aboutLinks },
          ].map(({ title, links }) => (
            <div key={title}>
              <h2 className="mb-3 font-display font-bold">{title}</h2>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground transition-colors duration-150 hover:text-brand-text"
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-5xl px-6 py-5 text-sm text-muted-foreground">
          {t.rich("copyright", { year: <CurrentYear key="year" /> })}
        </p>
      </div>
    </footer>
  );
}
