import { test, expect, devices } from '@playwright/test';

// Regression for the iPad 7th-gen bug: after rating a card the NEXT card's front
// text was invisible (stuck at opacity:0 from framer-motion) until the user
// tapped the screen. We run this on WebKit at an iPad-sized viewport — the
// closest automated proxy for iPadOS Safari — and assert the next card paints
// to full opacity without any extra interaction.
test.use({ ...devices['iPad (gen 7)'] ?? {}, browserName: 'webkit' });

test('next card front text is visible after rating without an extra tap', async ({ page }) => {
  await page.goto('/decks');
  await page.getByRole('button', { name: /new deck/i }).click();
  await page.getByLabel(/deck name/i).fill('iPad Repro');
  await page.getByRole('button', { name: /create/i }).click();
  await page.getByRole('link', { name: /ipad repro/i }).click();

  // Add two cards in one editor session: first via "Save & add another"
  // (form clears, stays put), second via "Save & done" (returns to deck).
  await page.locator('main').getByRole('link', { name: /add card/i }).click();
  await page.getByLabel('Front').fill('First question front');
  await page.getByLabel('Back').fill('First answer');
  await page.getByRole('button', { name: /save & add another/i }).click();
  await expect(page.getByRole('status')).toHaveText(/added/i);

  await page.getByLabel('Front').fill('Second question front');
  await page.getByLabel('Back').fill('Second answer');
  await page.getByRole('button', { name: /save & done/i }).click();

  await page.locator('main').getByRole('link', { name: /study/i }).first().click();

  const card = page.locator('[aria-label="Flashcard"] > div').first();
  const prompt = card.locator('p').first();

  // Card 1 — reveal and rate Easy so it graduates and card 2 appears.
  await expect(prompt).toContainText(/question front/);
  await page.getByRole('button', { name: /show answer/i }).click();
  await page.getByRole('button', { name: /easy/i }).click();

  // Card 2 must be painted to full opacity and its front text shown with NO
  // extra tap. Under the old framer-motion bug the card stayed at opacity:0.
  await expect(card).toHaveCSS('opacity', '1');
  await expect(prompt).toContainText(/question front/);
});
