// These tests and the browser journeys write to the database, and .env.local usually points
// at the live one. They only run against a local database unless someone says otherwise.
export function refuseLiveDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error("MONGODB_URI is not set");
  const host = new URL(uri.replace(/^mongodb(\+srv)?:/, "http:")).hostname;
  const local = ["localhost", "127.0.0.1", "[::1]", "mongo"].includes(host);
  if (!local && process.env.E2E_ALLOW_LIVE_DB !== "1") {
    throw new Error(`Refusing to run against ${host}. Use a local database, or set E2E_ALLOW_LIVE_DB=1 if you mean it.`);
  }
}
