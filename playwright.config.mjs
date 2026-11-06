import { defineConfig } from "@playwright/test";
import { refuseLiveDatabase } from "./tests/db/guard.mjs";

// The journeys read the same database the server does
try {
  process.loadEnvFile(".env.local");
} catch {
  // No such file on CI, where the workflow sets the variables itself
}
refuseLiveDatabase();

const PORT = 3124;
const CI = Boolean(process.env.CI);

// One browser at a time: these journeys share a server and a database, and heavier runs
// have frozen development machines. Run `npm run build` first.
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Edge is on every Windows machine, so nothing needs downloading there
    channel: CI ? undefined : "msedge",
    locale: "ar-SA",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !CI,
    timeout: 120_000,
    // No email leaves during a test
    env: { SMTP_USER: "", SMTP_PASS: "" },
  },
});
