import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import AccountLinks from "@/components/account-links";
import LocaleSwitcher from "@/components/locale-switcher";
import Logo from "@/components/logo";
import NavLinks from "@/components/nav-links";
import MobileMenu from "@/components/mobile-menu";
import ThemeToggle from "@/components/theme-toggle";

// Server Component: only the small interactive parts below are client code
export default function SiteHeader() {
  const t = useTranslations("Site");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/" aria-label={t("homeLabel")} className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label={t("mainNav")} className="hidden md:block">
          <NavLinks className="flex items-center gap-1" linkClassName="px-4 py-2 text-sm" />
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <LocaleSwitcher />
          <AccountLinks />
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}
