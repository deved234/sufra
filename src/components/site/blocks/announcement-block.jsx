import { useLocale, useTranslations } from "next-intl";
import { inLanguage } from "@/components/site/blocks/block-helpers";

// A short message, like a Ramadan offer. Empty in this language shows nothing.
export default function AnnouncementBlock({ block, context }) {
  const t = useTranslations("Restaurant");
  const locale = useLocale();
  const text = inLanguage(block.props.text, locale);
  if (!text) return context.editing ? <p className="mx-auto w-full max-w-5xl px-6 py-3 text-muted-foreground">{t("announcementEmpty")}</p> : null;
  const strong = block.props.tone === "brand";
  return (
    <aside className={strong ? "bg-brand text-on-brand" : "bg-brand-soft text-on-brand-soft"}>
      <p className="mx-auto max-w-5xl px-6 py-3 text-center font-semibold">{text}</p>
    </aside>
  );
}
