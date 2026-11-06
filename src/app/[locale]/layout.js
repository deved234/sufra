import Script from "next/script";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { pickMessages, PUBLIC_NAMESPACES } from "@/i18n/messages";
import { SITE_URL } from "@/lib/site-url";
import { directions, routing } from "@/i18n/routing";
import { fontVariables, themeScript } from "@/app/fonts";
import "../globals.css";

// Both languages are built ahead of time. With Cache Components the root param
// must list at least one value, or the build fails.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations("Metadata");
  return {
    // Makes every relative link in metadata absolute: search engines ignore
    // relative hreflang alternates
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: t("template") },
    description: t("description"),
    // What shows when a link is shared in a chat. A restaurant with a cover replaces it.
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      locale: locale === "ar" ? "ar_SA" : "en_US",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: t("imageAlt") }],
    },
    twitter: { card: "summary_large_image" },
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
