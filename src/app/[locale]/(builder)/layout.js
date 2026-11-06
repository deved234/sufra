import { NextIntlClientProvider } from "next-intl";
import { pickMessages } from "@/i18n/messages";

export const metadata = {
  robots: { index: false, follow: false },
};

// The site editor takes the whole screen, so it has none of the dashboard's frame. Its
// address is still under /dashboard, which keeps it behind sign-in.
export default async function BuilderLayout({ children }) {
  return <NextIntlClientProvider messages={await pickMessages(["Site", "Theme", "LocaleSwitcher", "Form", "Dashboard", "Menu", "MenuEditor", "Restaurant", "Dish", "OpenStatus", "Photos", "SiteBuilder"])}>{children}</NextIntlClientProvider>;
}
