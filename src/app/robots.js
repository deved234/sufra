import { SITE_URL } from "@/lib/site-url";

// The admin panel isn't listed, because this file would give its address away:
// visitors get a 404 there, which keeps it out of search engines anyway (src/proxy.js).
// Sign-in pages aren't either: they carry noindex, which a crawler can only read if
// it's allowed to open them.
export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/en/dashboard", "/account", "/en/account", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
