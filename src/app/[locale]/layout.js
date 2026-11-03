import Script from "next/script";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { pickMessages, PUBLIC_NAMESPACES } from "@/i18n/messages";
import { directions, routing } from "@/i18n/routing";
import { fontVariables, themeScript } from "@/app/fonts";
import "../globals.css";

// Both languages are built ahead of time. With Cache Components the root param
// must list at least one value, or the build fails.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata() {
  const t = await getTranslations("Metadata");
  return {
    title: { default: t("title"), template: t("template") },
    description: t("description"),
  };
}

// The root layout now sits inside [locale], so it can set lang and dir per language
export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const clientMessages = await pickMessages(PUBLIC_NAMESPACES);

  return (
    <html
      lang={locale}
      dir={directions[locale]}
      suppressHydrationWarning
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {/* Hands the current language and its messages to Client Components */}
        <NextIntlClientProvider messages={clientMessages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
