import { useTranslations } from "next-intl";

// First stop for keyboard users: jumps past the header straight to the content.
// Hidden until it receives focus.
export default function SkipLink() {
  const t = useTranslations("Site");
  return (
    <a
      href="#main"
      className="sr-only rounded-pill bg-foreground px-4 py-2 text-sm font-semibold text-background focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50"
    >
      {t("skip")}
    </a>
  );
}
