// The public address of the site, for absolute links (hreflang, canonical, Open
// Graph). Vercel provides the production domain at build and run time; locally
// it falls back to the dev server.
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";
