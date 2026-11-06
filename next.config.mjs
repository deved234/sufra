import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

// Sent with every page. The dashboard must never load inside another site's frame
// (clickjacking), browsers must not guess file types, and other sites get only our
// origin in the Referer header.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// A customer's pages used to live under /dashboard, and emails already sent link there
const movedPages = [
  ["/dashboard/bookings", "/account/bookings"],
  ["/dashboard/bookings/:id", "/account/bookings/:id"],
  ["/dashboard/favorites", "/account/favorites"],
  ["/dashboard/account", "/account/settings"],
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Part of every photo's address, so the browser needs it too. It isn't a secret.
  env: {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return movedPages.flatMap(([from, to]) => [
      { source: from, destination: to, permanent: false },
      { source: `/en${from}`, destination: `/en${to}`, permanent: false },
    ]);
  },
  // The project is its own root, whatever lockfiles sit in parent folders
  outputFileTracingRoot: import.meta.dirname,
  experimental: {
    agentFeedback: false,
    // A 404 page for URLs outside [locale], since there is no app/layout.js anymore
    globalNotFound: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
