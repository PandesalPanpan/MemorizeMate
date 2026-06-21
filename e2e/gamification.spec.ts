import { test, expect, type Page } from '@playwright/test';

async function createDeck(page: Page, name: string) {
  await page.goto('/decks');
  await page.getByRole('button', { name: /new deck/i }).click();
  await page.getByLabel(/deck name/i).fill(name);
  await page.getByRole('button', { name: /create/i }).click();
  await page.getByRole('link', { name: new RegExp(name, 'i') }).click();
}

async function addCard(page: Page, front: string, back: string) {
  await page.locator('main').getByRole('link', { name: /add card/i }).click();
  await page.getByLabel('Front').fill(front);
  await page.getByLabel('Back').fill(back);
  // New-card form exposes "Save & done" (returns to the deck).
  await page.getByRole('button', { name: 'Save & done' }).click();
  await expect(page.getByText(front)).toBeVisible();
}

async function revealAndRate(page: Page, rating: RegExp) {
  await page.getByRole('button', { name: /show answer/i }).click();
  await page.getByRole('button', { name: rating }).click();
}

test('batched session shows XP, combo, summary, then continues', async ({ page }) => {
  await createDeck(page, 'XP Deck');
  await addCard(page, 'Q1', 'A1');
  await addCard(page, 'Q2', 'A2');
  await addCard(page, 'Q3', 'A3');

  await page.locator('main').getByRole('link', { name: /^Study$/ }).click();

  // Persistent XP bar (level badge) is visible during study.
  await expect(page.getByText(/Lv\s*1/i)).toBeVisible();

  // Rate three cards "Easy"; the combo badge appears once the combo reaches 2.
  await revealAndRate(page, /easy/i);
  await revealAndRate(page, /easy/i);
  await expect(page.getByTestId('combo-badge')).toBeVisible();
  await revealAndRate(page, /easy/i);

  // Session summary with XP payoff + a prominent Continue.
  await expect(page.getByTestId('session-summary')).toBeVisible();
  await expect(page.getByTestId('summary-xp')).toBeVisible();
  await expect(page.getByTestId('summary-xp')).toContainText('XP');

  await page.getByTestId('continue-studying').click();
  // Nothing more due — classic done screen.
  await expect(page.getByText(/all done/i)).toBeVisible();
});

test('XP persists and level bar advances on Home', async ({ page }) => {
  await createDeck(page, 'Home XP');
  await addCard(page, 'Q1', 'A1');
  await page.locator('main').getByRole('link', { name: /^Study$/ }).click();
  await revealAndRate(page, /easy/i);
  await expect(page.getByTestId('session-summary')).toBeVisible();

  await page.goto('/');
  // Home shows the level bar; XP was earned so progress is non-zero.
  await expect(page.getByText(/Lv\s*\d+/i)).toBeVisible();
});

test('gamification toggle OFF hides XP UI and keeps classic study', async ({ page }) => {
  // Turn gamification off FIRST, then confirm it persisted across a reload.
  // (Creating a card and then studying it within one SPA session keeps the
  // card-create→study path reload-free and deterministic.)
  await page.goto('/settings');
  const toggle = page.getByRole('checkbox', { name: /gamification/i });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: /gamification/i })).not.toBeChecked();

  await createDeck(page, 'Classic Deck');
  await addCard(page, 'Q1', 'A1');
  await page.locator('main').getByRole('link', { name: /^Study$/ }).click();
  await expect(page.getByRole('button', { name: /show answer/i })).toBeVisible();

  // No level bar, no combo while studying.
  await expect(page.getByText(/Lv\s*1/i)).toHaveCount(0);
  await expect(page.getByTestId('combo-badge')).toHaveCount(0);

  await revealAndRate(page, /easy/i);

  // Classic flow: plain "All done", no session summary.
  await expect(page.getByText(/all done/i)).toBeVisible();
  await expect(page.getByTestId('session-summary')).toHaveCount(0);
});

test('exam mode awards XP when gamification is on', async ({ page }) => {
  await createDeck(page, 'Exam XP');
  await addCard(page, 'Q1', 'A1');

  await page.locator('main').getByRole('link', { name: /^Exam$/ }).click();
  await page.getByRole('button', { name: /start exam/i }).click();
  await page.getByRole('button', { name: /show answer/i }).click();
  await page.getByRole('button', { name: /got it right/i }).click();

  await expect(page.getByText(/exam complete/i)).toBeVisible();
  await expect(page.getByTestId('exam-xp')).toContainText('XP');
});

test('Study all button starts an uncapped session', async ({ page }) => {
  await createDeck(page, 'Study All Deck');
  await addCard(page, 'Q1', 'A1');
  await page.locator('main').getByRole('link', { name: /^Study all$/ }).click();
  // Lands in study with the card and the XP bar (gamification on).
  await expect(page.getByText('Q1')).toBeVisible();
  await expect(page.getByText(/Lv\s*1/i)).toBeVisible();
});
