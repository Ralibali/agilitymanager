import { defineConfig, devices } from "@playwright/test";

// Run against a native build preview, or set AGILITY_MOBILE_ENTRY=mobile.html
// when running the native Vite development server. Existing web e2e is separate.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "mobile.e2e.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.AGILITY_MOBILE_BASE_URL || "http://127.0.0.1:3001",
    actionTimeout: 15_000,
    acceptDownloads: true,
    trace: "retain-on-failure",
    launchOptions: process.env.AGILITY_MOBILE_CHROMIUM
      ? { executablePath: process.env.AGILITY_MOBILE_CHROMIUM }
      : undefined,
  },
  projects: [
    { name: "android-viewport", use: { ...devices["Pixel 5"], browserName: "chromium" } },
    { name: "iphone-viewport", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
  webServer: process.env.AGILITY_MOBILE_BASE_URL ? undefined : {
    command: 'node node_modules/vite/bin/vite.js preview --config vite.native.config.ts --host 127.0.0.1 --port 3001 --strictPort',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
  },
});
