import { Suspense } from "react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pickMessages } from "@/i18n/messages";
import Logo from "@/components/logo";
import ThemeToggle from "@/components/theme-toggle";
import LocaleSwitcher from "@/components/locale-switcher";
import UserMenu from "@/components/dashboard/user-menu";
import Skeleton from "@/components/skeleton";
import SkipLink from "@/components/skip-link";

export const metadata = {
  robots: { index: false, follow: false },
};

// The frame is static and shows at once. Everything that needs the session (the
// user name, the pages) streams in behind Suspense, as Cache Components requires
// for anything that reads cookies.
export default async function DashboardLayout({ children }) {
  return (
    <NextIntlClientProvider messages={await pickMessages(["Site", "Theme", "LocaleSwitcher", "Form", "Dashboard", "Menu", "MenuEditor", "Booking", "Bookings"])}>
      <DashboardFrame>{children}</DashboardFrame>
    </NextIntlClientProvider>
  );
}

function DashboardFrame({ children }) {
  const t = useTranslations("Dashboard");
  const site = useTranslations("Site");
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" aria-label={site("homeLabel")} className="shrink-0 rounded-md">
              <Logo />
            </Link>
            <Link
              href="/dashboard"
              className="hidden rounded-pill px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground sm:block"
            >
              {t("myRestaurants")}
            </Link>
            <Link
              href="/dashboard/bookings"
              className="hidden rounded-pill px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground sm:block"
            >
              {t("myBookings")}
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle compact />
            {/* It reads the current path, which dashboard addresses only know at request time */}
            <Suspense fallback={<Skeleton className="h-9 w-20 rounded-pill" />}>
              <LocaleSwitcher />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-9 w-24 rounded-pill" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<DashboardSkeleton />}>{children}</Suspense>
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-36 w-full rounded-lg" />
      </div>
    </div>
  );
}
