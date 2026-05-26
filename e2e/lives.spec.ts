import { test, expect } from '@playwright/test';

test('running out of lives locks study, donation page unlocks', async ({ page }) => {
  await page.goto('/decks');
  await page.getByRole('button', { name: /new deck/i }).click();
  await page.getByLabel(/deck name/i).fill('Lives Deck');
  await page.getByRole('button', { name: /create/i }).click();

  // Force lockout by setting lives to 0 through the store on window (exposed in dev).
  await page.evaluate(async () => {
    // @ts-expect-error dev hook
    const s = window.__mmStore;
    if (s) { s.setState({ lives: { current: 0, lastEventAt: Date.now() } }); }
  });

  await page.getByRole('link', { name: /lives deck/i }).click();
  await page.getByRole('link', { name: /^study$/i }).click();
  await expect(page.getByText(/out of lives/i)).toBeVisible();
  await page.getByRole('link', { name: /unlock now/i }).click();
  await expect(page.getByText(/0976 429 5810/)).toBeVisible();
  await page.getByRole('button', { name: /unlock without donating/i }).click();
  await expect(page).toHaveURL(/\/decks/);
});
