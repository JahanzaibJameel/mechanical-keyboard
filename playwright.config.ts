import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

/**
 * The e2e suite targets a production build served by `next start`, so the specs
 * exercise the same bundle Lighthouse measures. testDir is pinned to
 * tests/e2e: without it Playwright sweeps the whole repository and tries to run
 * the Vitest unit specs under tests/unit, which abort on their `vitest` import.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.test.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start",
    port: PORT,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});