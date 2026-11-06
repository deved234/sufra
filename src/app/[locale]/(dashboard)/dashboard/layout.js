import { NextIntlClientProvider, useTranslations } from "next-intl";
import { pickMessages } from "@/i18n/messages";
import AppFrame from "@/components/app-frame";
import DemoBanner from "@/components/demo-banner";
import OwnerNavLinks from "@/components/dashboard/owner-nav";

export const metadata = {
  robots: { index: false, follow: false },
};

// A restaurant owner's pages. A customer's own pages are under /account.
export default async function DashboardLayout({ children }) {
  return (
    <NextIntlClientProvider messages={await pickMessages(["Site", "Theme", "LocaleSwitcher", "Form", "Dashboard", "Menu", "MenuEditor", "Booking", "Bookings", "Auth", "OpenStatus", "Schedule", "Status", "Restaurant", "Photos", "Qr"])}>
      <DashboardFrame>{children}</DashboardFrame>
    </NextIntlClientProvider>
  );
}

function DashboardFrame({ children }) {
  const t = useTranslations("Dashboard");
  return (
    <AppFrame navLabel={t("ownerNav")} nav={<OwnerNavLinks />}>
      <DemoBanner />
      {children}
    </AppFrame>
  );
}
