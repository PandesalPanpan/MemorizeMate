import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StudyScreen } from './StudyScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

function freshStore() {
  store.setState({ repo: new IndexedDbRepository('daily-' + Math.random()), decks: [] });
}

async function seed(props?: { newCardsPerDay?: number; reviewsPerDay?: number }) {
  freshStore();
  const deck = await store.getState().createDeck({ name: 'LimitTest', description: '', color: 'sage' });
  await store.getState().updateDeck({
    ...deck,
    newCardsPerDay: props?.newCardsPerDay,
    reviewsPerDay: props?.reviewsPerDay,
  });
  return deck.id;
}

async function addCards(deckId: string, count: number) {
  for (let i = 0; i < count; i++) {
    await store.getState().addCard({
      deckId,
      type: 'basic',
      front: `Q${i}`,
      back: `A${i}`,
      tags: [],
    });
  }
}

async function addReviewLogs(deckId: string, count: number) {
  const cards = await store.getState().repo.listCards(deckId);
  for (let i = 0; i < Math.min(count, cards.length); i++) {
    await store.getState().repo.addReviewLog({
      id: crypto.randomUUID(),
      cardId: cards[i].id,
      timestamp: Date.now(),
      rating: 'good',
      elapsedDays: 0,
      scheduledDays: 1,
    });
  }
}

async function makeCardsReviewCards(deckId: string, count: number) {
  const cards = await store.getState().repo.listCards(deckId);
  const yesterday = new Date(Date.now() - 86400000);
  for (let i = 0; i < Math.min(count, cards.length); i++) {
    const card = cards[i];
    card.srs.reps = 3;
    card.srs.due = yesterday;
    await store.getState().repo.putCard(card);
  }
}

describe('StudyScreen daily limits', () => {
  let deckId = '';

  describe('newCardsPerDay', () => {
    beforeEach(async () => {
      deckId = await seed({ newCardsPerDay: 3 });
      await addCards(deckId, 5);
    });

    it('shows warning when new card limit is reached', async () => {
      await addReviewLogs(deckId, 3);
      render(
        <MemoryRouter initialEntries={[`/decks/${deckId}/study`]}>
          <Routes><Route path="/decks/:deckId/study" element={<StudyScreen />} /></Routes>
        </MemoryRouter>,
      );
      expect(await screen.findByText(/reviewed 3\/3 new cards/i)).toBeInTheDocument();
    });

    it('hides warning when dismissed', async () => {
      await addReviewLogs(deckId, 3);
      render(
        <MemoryRouter initialEntries={[`/decks/${deckId}/study`]}>
          <Routes><Route path="/decks/:deckId/study" element={<StudyScreen />} /></Routes>
        </MemoryRouter>,
      );
      expect(await screen.findByText(/reviewed 3\/3 new cards/i)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /continue anyway/i }));
      expect(screen.queryByText(/reviewed 3\/3 new cards/i)).not.toBeInTheDocument();
    });

    it('does not show warning when limit is not reached', async () => {
      await addReviewLogs(deckId, 2);
      render(
        <MemoryRouter initialEntries={[`/decks/${deckId}/study`]}>
          <Routes><Route path="/decks/:deckId/study" element={<StudyScreen />} /></Routes>
        </MemoryRouter>,
      );
      await screen.findByText('Studying');
      expect(screen.queryByText(/reviewed \d+\/\d+ new cards/i)).not.toBeInTheDocument();
    });
  });

  describe('reviewsPerDay', () => {
    beforeEach(async () => {
      deckId = await seed({ reviewsPerDay: 5 });
      await addCards(deckId, 5);
    });

    it('shows warning when review limit is reached', async () => {
      await makeCardsReviewCards(deckId, 5);
      await addReviewLogs(deckId, 5);
      render(
        <MemoryRouter initialEntries={[`/decks/${deckId}/study`]}>
          <Routes><Route path="/decks/:deckId/study" element={<StudyScreen />} /></Routes>
        </MemoryRouter>,
      );
      expect(await screen.findByText(/completed 5\/5 reviews/i)).toBeInTheDocument();
    });

    it('does not show warning when limit is not set', async () => {
      const unsetId = await seed({}); // No limits set
      await addCards(unsetId, 5);
      await addReviewLogs(unsetId, 5);
      render(
        <MemoryRouter initialEntries={[`/decks/${unsetId}/study`]}>
          <Routes><Route path="/decks/:deckId/study" element={<StudyScreen />} /></Routes>
        </MemoryRouter>,
      );
      await screen.findByText('Studying');
      expect(screen.queryByText(/⚠/i)).not.toBeInTheDocument();
    });
  });
});
