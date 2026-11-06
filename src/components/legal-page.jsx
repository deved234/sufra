import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// The privacy and terms pages: the same frame around a list of sections from the messages
export default function LegalPage({ namespace }) {
  const t = useTranslations(namespace);
  const common = useTranslations("Legal");

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-h1 font-extrabold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{common("updated")}</p>
        <p className="rounded-md bg-surface-tint px-4 py-3">{common("demo")}</p>
        <p className="text-lg text-muted-foreground">{t("lead")}</p>
      </header>

      {t.raw("sections").map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="font-display text-h3 font-bold">{section.title}</h2>
          {section.body?.map((paragraph) => (
            <p key={paragraph} className="text-muted-foreground">
              {paragraph}
            </p>
          ))}
          {section.items && (
            <ul className="flex list-disc flex-col gap-2 ps-5 text-muted-foreground">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <p className="border-t border-border pt-6">
        {common("questions")}{" "}
        <Link href="/contact" className="font-semibold text-brand-text hover:underline">
          {common("contactLink")}
        </Link>
      </p>
    </article>
  );
}
