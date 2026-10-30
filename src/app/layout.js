import { Inter, IBM_Plex_Sans_Arabic, Alexandria } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Latin text
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
});

// Display headings, Arabic and Latin
const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  variable: "--font-alexandria",
});

// Runs before the first paint so the saved theme never flashes
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

export const metadata = {
  title: {
    default: "سُفرة | موقع مطعمك جاهز في دقائق",
    template: "%s | سُفرة",
  },
  description:
    "سُفرة تخلّي أي مطعم يسوّي موقعه الخاص في دقائق: منيو بـ QR، وحجز طاولات، ولوحة تحكم سهلة.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${inter.variable} ${plexArabic.variable} ${alexandria.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
