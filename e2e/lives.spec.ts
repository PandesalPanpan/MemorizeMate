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
  // Donation screen now has a form — enter 0 to skip donation
  await page.getByLabel(/how much/i).fill('0');
  await page.getByRole('button', { name: /unlock lives/i }).click();
  // DonationScreen navigates to home (/) after unlock
  await expect(page).toHaveURL(/^http:\/\/localhost:5180\/$/);
});
