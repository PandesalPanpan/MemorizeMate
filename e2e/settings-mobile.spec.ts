import { test, expect } from '@playwright/test';

test('mobile: reminder time fields are visible and keep their values', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); // iPhone-ish
  await page.goto('/settings');

  // Enable the daily reminder so the time fields render.
  await page.getByRole('checkbox', { name: /daily review reminder/i }).click();

  const hour = page.getByLabel('Hour');
  const minute = page.getByLabel('Minute');
  const ampm = page.getByLabel('AM/PM');

  // All three selects must be visible (previously collapsed to empty on mobile).
  await expect(hour).toBeVisible();
  await expect(minute).toBeVisible();
  await expect(ampm).toBeVisible();

  await hour.selectOption('3');
  await minute.selectOption('45');
  await ampm.selectOption('PM');

  // Each select must have a usable rendered width (not collapsed to ~0).
  for (const sel of [hour, minute, ampm]) {
    const box = await sel.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(40);
  }

  await page.reload();
  await expect(page.getByLabel('Hour')).toHaveValue('3');
  await expect(page.getByLabel('Minute')).toHaveValue('45');
  await expect(page.getByLabel('AM/PM')).toHaveValue('PM');
});
