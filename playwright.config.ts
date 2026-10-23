import { defineConfig, devices } from "@playwright/test";

const headed = process.env.E2E_HEADLESS !== "1";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/report" }]],
  outputDir: "e2e/test-results",
  use: {
    headless: !headed,
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      slowMo: headed ? 160 : 0,
    },
    trace: "retain-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: !headed,
        viewport: { width: 1440, height: 900 },
        launchOptions: { slowMo: headed ? 160 : 0 },
      },
    },
  ],
  webServer: [
    {
      command: "bun run dev:api",
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "bun run dev:frontend",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "bun run dev:admin",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
