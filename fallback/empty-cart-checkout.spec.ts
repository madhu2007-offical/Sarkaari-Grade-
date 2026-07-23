import { test, expect } from "@playwright/test";

test.describe("Empty cart checkout bug", () => {
  test("shows error when checking out empty cart", async ({ page }) => {
    const baseUrl = process.env.BASE_URL || process.env.DEMO_APP_URL || "http://localhost:3001";
    await page.goto(baseUrl);
    await page.getByRole("button", { name: "Checkout" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/cart is empty|Cannot checkout/i)).toBeVisible();
  });
});
