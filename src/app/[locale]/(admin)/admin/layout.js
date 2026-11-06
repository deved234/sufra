import { Suspense } from "react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pickMessages } from "@/i18n/messages";
import { requireAdmin } from "@/lib/auth/dal";
import AdminNav from "@/components/admin/admin-nav";
import UserMenu from "@/components/user-menu";
import Logo from "@/components/logo";
import LocaleSwitcher from "@/components/locale-switcher";
import Skeleton from "@/components/skeleton";
import SkipLink from "@/components/skip-link";
import ThemeToggle from "@/components/theme-toggle";

export const metadata = {
  robots: { index: false, follow: false },
};

// Nothing of the panel, not even its links, renders until the visitor is known to be
// an admin. To anyone else this address doesn't exist.
export default function AdminLayout({ children }) {
  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }) {
  await requireAdmin();
  return (
    <NextIntlClientProvider messages={await pickMessages(["Site", "Theme", "LocaleSwitcher", "Form", "Admin", "Booking"])}>
      <AdminFrame>{children}</AdminFrame>
    </NextIntlClientProvider>
  );
}

function AdminFrame({ children }) {
  const t = useTranslations("Admin");
  const site = useTranslations("Site");
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SkipLink />
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label={site("homeLabel")} className="shrink-0 rounded-md">
              <Logo />
            </Link>
            <span className="hidden rounded-pill bg-brand-soft px-3 py-1 text-xs font-bold text-on-brand-soft sm:block">{t("title")}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle compact />
            <LocaleSwitcher />
            <UserMenu />
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:gap-8">
        <AdminNav />
        <main id="main" className="flex min-w-0 flex-1 flex-col gap-6">
          {children}
        </main>
      </div>
    </div>
  );
}
