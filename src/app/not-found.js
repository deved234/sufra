import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

// Root 404: any unmatched URL lands here. It renders inside the root layout only,
// not inside (marketing), so the header and footer are added by hand.
export const metadata = {
  title: "الصفحة مو موجودة",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-24 text-center">
          <span className="font-display text-display font-extrabold text-brand-text" dir="ltr">
            404
          </span>
          <h1 className="font-display text-h2 font-extrabold">الصفحة اللي تدوّر عليها مو موجودة</h1>
          <p className="text-muted-foreground">يمكن الرابط فيه غلطة، أو الصفحة انحذفت.</p>
          <Link
            href="/"
            className="rounded-pill bg-cta px-6 py-3 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover"
          >
            ارجع للرئيسية
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
