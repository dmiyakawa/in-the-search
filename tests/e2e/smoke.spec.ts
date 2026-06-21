import { test, expect } from '@playwright/test';

type TestHook = {
  getView: () => { size: number; origin: { x: number; y: number } };
};

const hexToPixel = (
  h: { q: number; r: number },
  size: number,
  origin: { x: number; y: number }
) => ({
  x: size * (Math.sqrt(3) * h.q + (Math.sqrt(3) / 2) * h.r) + origin.x,
  y: size * ((3 / 2) * h.r) + origin.y,
});

test('page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('#hud')).toContainText('In the Search MVP');
  await expect(page.locator('#hud')).toContainText('Turn 1 / player');
  await expect(page.locator('#hud')).toContainText('Incoming HP');
  await page.keyboard.press('U');
  await expect(page.locator('#hud')).toContainText('Turn 1 / player');
});

test('wins through known canvas clicks', async ({ page }) => {
  await page.goto('/?__scenario=win&__test=1');
  const canvas = page.locator('canvas#game');
  await expect(canvas).toBeVisible();
  const view = await page.evaluate(() =>
    (window as unknown as { __ITS_TEST__: TestHook }).__ITS_TEST__.getView()
  );

  for (const hex of [
    { q: 1, r: 0 },
    { q: 2, r: 0 },
  ]) {
    const point = hexToPixel(hex, view.size, view.origin);
    await canvas.click({ position: point });
  }

  await expect(page.locator('#hud')).toContainText('Ship reached');
});
