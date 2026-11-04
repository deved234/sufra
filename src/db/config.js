// Named explicitly instead of taken from the connection string: a URI without
// "/sufra" would otherwise fall back to the shared "test" database.
// Vercel Preview deployments set MONGODB_DB=sufra-preview so tests there never
// write to the live data.
export const DB_NAME = process.env.MONGODB_DB || "sufra";

export const RESTAURANTS = "restaurants";
export const USERS = "users";
export const SESSIONS = "sessions";
export const LOGIN_ATTEMPTS = "loginAttempts";
export const EMAIL_TOKENS = "emailTokens";
