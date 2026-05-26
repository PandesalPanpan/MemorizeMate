import { test, expect } from '@playwright/test';

test('create deck, add a card, study it', async ({ page }) => {
  await page.goto('/decks');
  await page.getByRole('button', { name: /new deck/i }).click();
  await page.getByLabel(/deck name/i).fill('E2E Biology');
  await page.getByRole('button', { name: /create/i }).click();
  await page.getByRole('link', { name: /e2e biology/i }).click();

  await page.getByRole('link', { name: /add card/i }).click();
  await page.getByLabel('Front').fill('Capital of France');
  await page.getByLabel('Back').fill('Paris');
  await page.getByRole('button', { name: /save card/i }).click();

  await page.getByRole('link', { name: /study/i }).click();
  await expect(page.getByText('Capital of France')).toBeVisible();
  await page.getByRole('button', { name: /show answer/i }).click();
  await expect(page.getByText('Paris')).toBeVisible();
  await page.getByRole('button', { name: /good/i }).click();
  await expect(page.getByText(/all done/i)).toBeVisible();
});
