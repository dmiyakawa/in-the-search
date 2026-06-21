import { test, expect } from '@playwright/test';

test('page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('#hud')).toContainText('In the Search MVP');
});
