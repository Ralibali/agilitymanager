import { defineConfig, devices } from "@playwright/test";

/**
 * Browser-regressionstester för banplaneraren.
 * Körs mot en riktig dev-server på port 8080 (samma som CI-jobbet startar).
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts/,
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : "line",
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1000 } } },
    { name: "mobil", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "npx vite --port 8080 --strictPort",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
