import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StudyScreen } from './StudyScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('StudyScreen lockout', () => {
  let deckId = '';
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('lock-' + Math.random()), decks: [], lives: { current: 0, lastEventAt: Date.now() } });
    const d = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    deckId = d.id;
    await store.getState().addCard({ deckId, type: 'basic', front: 'q', back: 'a', tags: [] });
  });

  it('shows the lockout screen instead of cards when out of lives', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/study`]}>
        <Routes><Route path="/decks/:deckId/study" element={<StudyScreen />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/out of lives/i)).toBeInTheDocument();
  });
});
