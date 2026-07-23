import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./generated",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || process.env.DEMO_APP_URL || "http://localhost:3001",
    headless: true,
    launchOptions: {
      channel: "chrome",
    },
  },
});
