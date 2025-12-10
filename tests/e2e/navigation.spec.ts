import { test, expect } from "@playwright/test";

// Minimal smoke to ensure the app loads and admin redirect works.
test.describe("Navigation smoke", () => {
    test("redirects anonymous users to login", async ({ page }) => {
        await page.goto("/");
        await page.waitForLoadState("domcontentloaded");
        await expect(page).toHaveURL(/login/);
    });

    test("admin page requires auth", async ({ page }) => {
        await page.goto("/admin");
        await page.waitForLoadState("domcontentloaded");
        await expect(page).toHaveURL(/login/);
    });
});
