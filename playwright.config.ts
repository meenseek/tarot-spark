import { defineConfig, devices } from "@playwright/test";

const port = process.env["PLAYWRIGHT_PORT"] ?? "3000";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  ...(process.env["CI"] ? { workers: 1 } : {}),
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm exec next dev --hostname 127.0.0.1 --port ${port}`,
    env: {
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: "ca-pub-1234567890123456",
      NEXT_PUBLIC_ADSENSE_SCRIPT_ENABLED: "true",
      NEXT_PUBLIC_GA_ID: "G-TEST1234",
      NEXT_PUBLIC_SITE_URL: baseURL,
      TAROT_INSTANT_READING_ENABLED: "true",
    },
    url: baseURL,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit-motion",
      testMatch: /card-motion\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
