// Playwright's CLI runs under plain Node (not Bun), so it doesn't get Bun's
// automatic .env loading — tests that talk to the DB directly need it loaded
// here instead.
import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  // Every test provisions its own isolated user and data (see
  // tests/e2e/support/fixtures.ts), so there is no shared mutable state to
  // serialize on — tests can run fully in parallel, including within a file.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // A single app server + Postgres back the whole suite, and each test creates
  // and authenticates its own user (real password hashing on the server), so
  // 3 workers is the sweet spot: a big speedup over serial without enough
  // concurrent load to starve the server. Locally, Playwright's default (half
  // the CPU cores) is fine.
  workers: process.env.CI ? 3 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
