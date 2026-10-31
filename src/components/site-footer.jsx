import Link from "next/link";
import { cacheLife } from "next/cache";
import Logo from "@/components/logo";
import { siteLinks } from "@/components/site-nav";

// With Cache Components, reading the clock during prerender is not allowed.
// Caching the result makes it part of the static shell, refreshed daily.
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col items-start gap-4">
          <Logo size="lg" gap="var(--surface)" />
          <p className="max-w-xs text-muted-foreground">موقع مطعمك جاهز في دقائق: منيو بـ QR، وحجز طاولات، ولوحة تحكم سهلة.</p>
        </div>

        <nav aria-label="روابط الموقع">
          <h2 className="mb-3 font-display font-bold">روابط</h2>
          <ul className="flex flex-col gap-2">
            {siteLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted-foreground transition-colors duration-150 hover:text-brand-text"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-5xl px-6 py-5 text-sm text-muted-foreground">
          © <CurrentYear /> سُفرة. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
