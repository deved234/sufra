import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/logo";
import ThemeToggle from "@/components/theme-toggle";
import LocaleSwitcher from "@/components/locale-switcher";
import UserMenu from "@/components/user-menu";
import Skeleton from "@/components/skeleton";
import SkipLink from "@/components/skip-link";

// The frame around signed-in pages: a customer's account and an owner's dashboard. It's
// static and shows at once. Everything that needs the session (the user menu, the
// pages) streams in behind Suspense, as Cache Components requires for anything that
// reads cookies.
export default function AppFrame({ navLabel, nav, bottomNav, children }) {
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
            {/* These read the current path, which these addresses only know at request time */}
            <nav aria-label={navLabel}>
              <Suspense fallback={null}>{nav}</Suspense>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle compact />
            <Suspense fallback={<Skeleton className="h-9 w-20 rounded-pill" />}>
              <LocaleSwitcher />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-9 w-24 rounded-pill" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      {/* Room at the bottom on phones for a fixed navigation bar */}
      <main id="main" className={`mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-8 sm:px-6 sm:py-10 ${bottomNav ? "pb-24" : "pb-8"}`}>
        <Suspense fallback={<AppSkeleton />}>{children}</Suspense>
      </main>
      {bottomNav && <Suspense fallback={null}>{bottomNav}</Suspense>}
    </div>
  );
}

function AppSkeleton() {
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
