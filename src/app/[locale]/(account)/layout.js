import { NextIntlClientProvider, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pickMessages } from "@/i18n/messages";
import Logo from "@/components/logo";
import ThemeToggle from "@/components/theme-toggle";
import LocaleSwitcher from "@/components/locale-switcher";
import SkipLink from "@/components/skip-link";

// Sign in and sign up: a quiet page with just the logo, no site navigation
export default async function AccountLayout({ children }) {
  return (
    <NextIntlClientProvider messages={await pickMessages(["Site", "Theme", "LocaleSwitcher", "Auth", "Form"])}>
      <AccountFrame>{children}</AccountFrame>
    </NextIntlClientProvider>
  );
}

function AccountFrame({ children }) {
  const t = useTranslations("Site");
  return (
    <div className="flex flex-1 flex-col bg-surface-tint">
      <SkipLink />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" aria-label={t("homeLabel")} className="rounded-md">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <LocaleSwitcher />
        </div>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center">{children}</main>
    </div>
  );
}
