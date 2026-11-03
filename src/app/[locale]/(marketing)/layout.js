import SkipLink from "@/components/skip-link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

// Shared frame for Sufra's own pages. The route group name "(marketing)"
// does not appear in the URL, and restaurant sites will not use this layout.
export default function MarketingLayout({ children }) {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
