import { NextIntlClientProvider, useTranslations } from "next-intl";
import { pickMessages } from "@/i18n/messages";
import AppFrame from "@/components/app-frame";
import { AccountBottomNav, AccountNavLinks } from "@/components/account/account-nav";

export const metadata = {
  robots: { index: false, follow: false },
};

// What every account has, owner or not: bookings, favorites and account details.
// Running a restaurant is under /dashboard.
export default async function AccountLayout({ children }) {
  return (
    <NextIntlClientProvider messages={await pickMessages(["Site", "Theme", "LocaleSwitcher", "Form", "Dashboard", "Menu", "MenuEditor", "Booking", "Bookings", "Account", "Auth", "OpenStatus", "Schedule", "Status", "Restaurant"])}>
      <AccountFrame>{children}</AccountFrame>
    </NextIntlClientProvider>
  );
}

function AccountFrame({ children }) {
  const t = useTranslations("Dashboard");
  return (
    <AppFrame navLabel={t("accountNav")} nav={<AccountNavLinks />} bottomNav={<AccountBottomNav />}>
      {children}
    </AppFrame>
  );
}
