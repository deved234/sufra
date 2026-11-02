import Link from "next/link";
import { fontVariables, themeScript } from "@/app/fonts";
import Logo from "@/components/logo";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import "./globals.css";

// 404 for any URL no route matches, in either language. The root layout lives in
// [locale], so there is no layout to compose a 404 from: Next.js serves this file
// as a complete static page instead. It can't know the visitor's language, so it
// shows both, reusing the same messages as the rest of the site.
export const metadata = {
  title: `${ar.NotFound.title} | ${en.NotFound.title}`,
};

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Logo />
        <span className="font-display text-display font-extrabold text-brand-text" dir="ltr">
          404
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-h2 font-extrabold">{ar.NotFound.heading}</h1>
          <p className="text-muted-foreground">{ar.NotFound.body}</p>
        </div>
        <div lang="en" dir="ltr" className="flex flex-col gap-2">
          <p className="font-display text-h3 font-bold">{en.NotFound.heading}</p>
          <p className="text-muted-foreground">{en.NotFound.body}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
          >
            {ar.NotFound.back}
          </Link>
          <Link
            href="/en"
            lang="en"
            className="rounded-pill border border-border-strong bg-surface px-6 py-3 font-semibold transition-colors duration-150 hover:bg-surface-muted"
          >
            {en.NotFound.back}
          </Link>
        </div>
      </body>
    </html>
  );
}
