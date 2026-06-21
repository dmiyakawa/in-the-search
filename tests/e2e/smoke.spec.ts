import { test, expect } from '@playwright/test';

test('page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('#hud')).toContainText('In the Search MVP');
  await expect(page.locator('#hud')).toContainText('Turn 1 / player');
  await expect(page.locator('#hud')).toContainText('Incoming HP');
  await page.keyboard.press('U');
  await expect(page.locator('#hud')).toContainText('Turn 1 / player');
});
