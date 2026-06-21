import { test, expect } from '@playwright/test';

type TestHook = {
  getView: () => { size: number; origin: { x: number; y: number } };
  getState: () => {
    inventory: { resource: number };
    units: Array<{ id: string; hp: number }>;
  };
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

test('mouse selection panels and action menu expose unit context', async ({ page }) => {
  await page.goto('/?__scenario=ui&__test=1');
  const canvas = page.locator('canvas#game');
  const view = await page.evaluate(() =>
    (window as unknown as { __ITS_TEST__: TestHook }).__ITS_TEST__.getView()
  );
  const point = (hex: { q: number; r: number }) => hexToPixel(hex, view.size, view.origin);

  await canvas.click({ position: point({ q: 0, r: 0 }) });
  await expect(page.locator('#action-menu')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gather (G)' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Build scout (B)' })).toBeDisabled();

  await canvas.click({ position: point({ q: 2, r: 0 }) });
  await expect(page.locator('#action-menu')).toBeHidden();

  await canvas.click({ position: point({ q: 0, r: 0 }) });
  await page.getByRole('button', { name: 'Gather (G)' }).click();
  await expect(page.locator('#hud')).toContainText('Resource 5');
  await expect(page.locator('#unit-panel [data-unit-id="player"]')).toHaveClass(/exhausted/);

  await canvas.click({ position: point({ q: 1, r: -1 }) });
  await expect(page.locator('#enemy-panel [data-enemy-id="e0"]')).toHaveClass(/selected/);
});

test('clicking an attackable enemy attacks instead of selecting it', async ({ page }) => {
  await page.goto('/?__scenario=ui&__test=1');
  const canvas = page.locator('canvas#game');
  const view = await page.evaluate(() =>
    (window as unknown as { __ITS_TEST__: TestHook }).__ITS_TEST__.getView()
  );
  const point = (hex: { q: number; r: number }) => hexToPixel(hex, view.size, view.origin);

  await canvas.click({ position: point({ q: 1, r: -1 }) });

  const enemyHp = await page.evaluate(
    () =>
      (window as unknown as { __ITS_TEST__: TestHook }).__ITS_TEST__
        .getState()
        .units.find((unit) => unit.id === 'e0')?.hp
  );
  expect(enemyHp).toBe(2);
  await expect(page.locator('#enemy-panel [data-enemy-id="e0"]')).toContainText('HP 4/4 -> 2/4');
  await expect(page.locator('#enemy-panel [data-enemy-id="e0"]')).not.toHaveClass(/selected/);
  await expect(page.locator('#unit-panel [data-unit-id="player"]')).toHaveClass(/selected/);

  await page.keyboard.press('U');
  await expect(page.locator('#enemy-panel [data-enemy-id="e0"]')).toContainText('HP 4/4');
  await expect(page.locator('#enemy-panel [data-enemy-id="e0"]')).not.toContainText('->');
  const restoredEnemyHp = await page.evaluate(
    () =>
      (window as unknown as { __ITS_TEST__: TestHook }).__ITS_TEST__
        .getState()
        .units.find((unit) => unit.id === 'e0')?.hp
  );
  expect(restoredEnemyHp).toBe(4);
});
