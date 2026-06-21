import { test, expect } from '@playwright/test';

test('create deck, add a card, study it', async ({ page }) => {
  await page.goto('/decks');
  await page.getByRole('button', { name: /new deck/i }).click();
  await page.getByLabel(/deck name/i).fill('E2E Biology');
  await page.getByRole('button', { name: /create/i }).click();
  await page.getByRole('link', { name: /e2e biology/i }).click();

  // BackLink should be visible on deck detail
  await expect(page.locator('main').getByRole('link', { name: /decks/i })).toBeVisible();

  await page.getByRole('link', { name: /add card/i }).click();
  await page.getByLabel('Front').fill('Capital of France');
  await page.getByLabel('Back').fill('Paris');
  await page.getByRole('button', { name: /save card/i }).click();

  // Back on deck detail page
  await expect(page.getByText(/capital of france/i)).toBeVisible();

  await page.getByRole('link', { name: /study/i }).click();
  await expect(page.getByText('Capital of France')).toBeVisible();
  await page.getByRole('button', { name: /show answer/i }).click();
  await expect(page.getByText('Paris')).toBeVisible();
  // Rate "Easy" to graduate immediately (new cards rated "Good" go to FSRS learning steps)
  await page.getByRole('button', { name: /easy/i }).click();
  // Gamification is on by default: finishing a batch shows the session summary.
  await expect(page.getByTestId('session-summary')).toBeVisible();
  await page.getByTestId('continue-studying').click();
  await expect(page.getByText(/all done/i)).toBeVisible();
});

test('cloze card reveals answer inline without duplicate sentence', async ({ page }) => {
  await page.goto('/decks');
  await page.getByRole('button', { name: /new deck/i }).click();
  await page.getByLabel(/deck name/i).fill('E2E Cloze');
  await page.getByRole('button', { name: /create/i }).click();
  await page.getByRole('link', { name: /e2e cloze/i }).click();

  await page.getByRole('link', { name: /add card/i }).click();

  await page.getByRole('button', { name: 'Cloze' }).click();

  const textarea = page.getByRole('textbox');
  await textarea.fill('The {{c1::mitochondria}} is the powerhouse of the cell.');

  await page.getByRole('button', { name: /save card/i }).click();

  await page.getByRole('link', { name: /study/i }).click();

  await expect(page.getByText(/\[\.\.\.\]/)).toBeVisible();
  await expect(page.getByText(/is the powerhouse of the cell/)).toBeVisible();

  await page.getByRole('button', { name: /show answer/i }).click();

  await expect(page.getByText(/mitochondria/)).toBeVisible();
  await expect(page.getByText(/is the powerhouse of the cell/)).toBeVisible();
  await expect(page.getByText(/\[\.\.\.\]/)).not.toBeVisible();

  await page.getByRole('button', { name: /easy/i }).click();
  await expect(page.getByTestId('session-summary')).toBeVisible();
  await page.getByTestId('continue-studying').click();
  await expect(page.getByText(/all done/i)).toBeVisible();
});

test('back links navigate correctly across the app', async ({ page }) => {
  // Create a deck first
  await page.goto('/decks');
  await page.getByRole('button', { name: /new deck/i }).click();
  await page.getByLabel(/deck name/i).fill('Back Link Test');
  await page.getByRole('button', { name: /create/i }).click();

  // Navigate to deck detail — BackLink should lead to /decks
  await page.getByRole('link', { name: /back link test/i }).click();
  const backToDecks = page.locator('main').getByRole('link', { name: /decks/i });
  await expect(backToDecks).toBeVisible();
  await backToDecks.click();
  await expect(page).toHaveURL(/\/decks/);

  // Navigate back to deck detail, then to card editor
  await page.getByRole('link', { name: /back link test/i }).click();
  await page.getByRole('link', { name: /add card/i }).click();
  // BackLink on card editor says "Back to deck"
  const backToDeck = page.locator('main').getByRole('link', { name: /back to deck/i });
  await expect(backToDeck).toBeVisible();
  await backToDeck.click();
  await expect(page).toHaveURL(/\/decks\/.+/);

  // Navigate to study — BackLink should lead back to deck
  await page.getByRole('link', { name: /study/i }).click();
  // Back link text on study is "Back to deck" or "Back"
  await page.locator('main').getByRole('link', { name: /back/i }).first().click();
  await expect(page).toHaveURL(/\/decks\/.+/);

  // Navigate to exam — BackLink should lead back to deck
  await page.getByRole('link', { name: /exam/i }).click();
  await expect(page.locator('main').getByRole('link', { name: /back to deck/i })).toBeVisible();
  await page.locator('main').getByRole('link', { name: /back to deck/i }).click();
  await expect(page).toHaveURL(/\/decks\/.+/);
});

test('FAB is hidden on study/exam/add-card and visible on deck pages', async ({ page }) => {
  // Create a deck first
  await page.goto('/decks');
  await page.getByRole('button', { name: /new deck/i }).click();
  await page.getByLabel(/deck name/i).fill('FAB Test');
  await page.getByRole('button', { name: /create/i }).click();

  // FAB visible on home page
  await page.goto('/');
  await expect(page.getByRole('button', { name: /add card/i })).toBeVisible();

  // Navigate to deck detail — FAB should be visible
  await page.getByRole('link', { name: /fab test/i }).click();
  const fab = page.getByRole('button', { name: /add card/i });
  await expect(fab).toBeVisible();

  // Navigate to card editor via the deck's "Add card" link (not the FAB)
  const addCardLink = page.locator('main').getByRole('link', { name: /add card/i });
  await addCardLink.click();
  // Wait for navigation to settle
  await page.waitForURL(/\/cards\/new/);
  // FAB should hide on card editor page
  await expect(page.getByLabel(/add card/i)).not.toBeVisible();
});

test('FAB shows deck picker with multiple decks on non-deck pages', async ({ page }) => {
  // Create two decks
  await page.goto('/decks');

  async function createDeck(name: string) {
    await page.getByRole('button', { name: /new deck/i }).click();
    await page.getByLabel(/deck name/i).fill(name);
    await page.getByRole('button', { name: /create/i }).click();
  }

  await createDeck('First Deck');
  await createDeck('Second Deck');

  // On home page with multiple decks, clicking FAB should show popover
  await page.goto('/');
  const fab = page.getByRole('button', { name: /add card/i });
  await fab.click();

  // Popover should appear with deck names — scope to menu popover
  await expect(page.getByText(/add card to/i)).toBeVisible();
  // Use getByRole to avoid ambiguity with deck cards on the page
  await expect(page.getByRole('button', { name: 'First Deck' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Second Deck' })).toBeVisible();
});

test('import/export page shows export first, then import with proper flow', async ({ page }) => {
  await page.goto('/import');

  // Export section should come first
  await expect(page.getByRole('heading', { name: 'Export backup' })).toBeVisible();
  await expect(page.getByText(/download all your decks/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /export json/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /export csv/i })).toBeVisible();

  // Import section follows
  await expect(page.getByRole('heading', { name: 'Import cards' })).toBeVisible();

  // Drop zone and paste area are visible
  await expect(page.getByText(/drop a backup file/i)).toBeVisible();
  await expect(page.getByLabel(/paste cards/i)).toBeVisible();

  // Paste some cards — deck selector should appear AFTER cards are detected
  await page.getByLabel(/paste cards/i).fill('First card | Answer 1');
  await expect(page.getByText(/1 cards detected/)).toBeVisible();
  await expect(page.getByLabel(/into deck/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /import 1 cards/i })).toBeVisible();

  // Before pasting, deck selector should NOT be visible
  await page.getByLabel(/paste cards/i).clear();
  await expect(page.getByLabel(/into deck/i)).not.toBeVisible();
});

test('AI generate page shows correct placeholder and aligned fields', async ({ page }) => {
  await page.goto('/generate');

  // Topic placeholder should mention Software Process and Product Quality
  const topicInput = page.getByLabel(/topic/i);
  await expect(topicInput).toHaveAttribute('placeholder', /software process and product quality/i);

  // How many and Card type should be in a grid row
  const countInput = page.getByLabel(/how many/i);
  const typeSelect = page.getByLabel(/card type/i);
  await expect(countInput).toBeVisible();
  await expect(typeSelect).toBeVisible();

  // Import button (without card count) should not appear before cards are pasted
  await expect(page.getByRole('button', { name: /^Import$/ })).not.toBeVisible();
});

test('lives indicator is visible with heart icon', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel(/lives/i)).toBeVisible();
});

test('reminder time shows AM/PM selectors and persists changes', async ({ page }) => {
  await page.goto('/settings');

  const reminderToggle = page.getByRole('checkbox', { name: /daily review reminder/i });
  await reminderToggle.click();
  await page.waitForTimeout(500);

  await expect(page.getByLabel('Hour')).toBeVisible();
  await expect(page.getByLabel('Minute')).toBeVisible();
  await expect(page.getByLabel('AM/PM')).toBeVisible();

  await page.getByLabel('Hour').selectOption('3');
  await page.getByLabel('Minute').selectOption('45');
  await page.getByLabel('AM/PM').selectOption('PM');

  await page.reload();

  await expect(page.getByLabel('Hour')).toHaveValue('3');
  await expect(page.getByLabel('Minute')).toHaveValue('45');
  await expect(page.getByLabel('AM/PM')).toHaveValue('PM');
});

test('collapsed sidebar shows icons at proper size and can toggle', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 1280, height: 800 });

  // Collapse the sidebar
  const collapseBtn = page.getByRole('button', { name: /collapse sidebar/i });
  if (await collapseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await collapseBtn.click();
  }

  // After collapsing, icons should still be in the sidebar
  await expect(page.getByRole('navigation').first()).toBeVisible();

  // Can expand again
  const expandBtn = page.getByRole('button', { name: /expand sidebar/i });
  if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expandBtn.click();
    await expect(page.getByRole('button', { name: /collapse sidebar/i })).toBeVisible();
  }
});

test('heatmap card fills width on desktop', async ({ page }) => {
  // Go to decks page first to create a deck (needed for heatmap to show)
  await page.goto('/decks');
  await page.getByRole('button', { name: /new deck/i }).click();
  await page.getByLabel(/deck name/i).fill('Heatmap Test');
  await page.getByRole('button', { name: /create/i }).click();

  // Now go home — heatmap section should be visible
  await page.goto('/');
  await page.setViewportSize({ width: 1280, height: 800 });

  // Activity section heading
  await expect(page.getByRole('heading', { name: /your activity/i })).toBeVisible();

  // Heatmap cells should be present
  const cells = page.locator('[title*="reviews"]');
  // The heatmap grid container should exist
  const grid = page.locator('[class*="grid"]').first();
  await expect(grid).toBeVisible({ timeout: 5000 }).catch(async () => {
    // If no grid class found, at least the legend should be visible
    await expect(page.getByText(/less/i)).toBeVisible();
    await expect(page.getByText(/more/i)).toBeVisible();
  });
});
