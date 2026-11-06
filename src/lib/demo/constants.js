// Temporary accounts anyone can open from /for-restaurants, to try the dashboard without
// signing up. ".invalid" is reserved by RFC 2606, so no mail can ever reach these addresses.
export const DEMO_DOMAIN = "demo.sufra.invalid";
export const DEMO_HOURS = 24;

export const isDemoEmail = (email) => typeof email === "string" && email.endsWith(`@${DEMO_DOMAIN}`);

// For the admin panel's reads: real accounts and restaurants only
export const NOT_DEMO = { demoExpiresAt: { $exists: false } };
