import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 30_000,
    retries: 0,
    use: {
        baseURL,
        headless: true,
    },
    reporter: [["list"]],
});
