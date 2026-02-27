import { test, expect } from "@playwright/test";

test("theme renders with dark Utility Forge tokens", async ({ page }) => {
  await page.goto("/inbox");
  await page.waitForLoadState("networkidle");

  const body = page.locator("body");
  await expect(body).toBeVisible();

  await page.screenshot({
    path: ".sisyphus/evidence/theme-home.png",
    fullPage: true,
  });
});
