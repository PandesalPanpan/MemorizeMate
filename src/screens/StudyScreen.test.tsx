import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StudyScreen } from './StudyScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

async function seed() {
  store.setState({ repo: new IndexedDbRepository('study-' + Math.random()), decks: [] });
  const deck = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
  await store.getState().addCard({ deckId: deck.id, type: 'basic', front: 'Q', back: 'A', tags: [] });
  return deck.id;
}

describe('StudyScreen', () => {
  let deckId = '';
  beforeEach(async () => { deckId = await seed(); });

  it('flips the card and grades it, advancing the session', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/study`]}>
        <Routes><Route path="/decks/:deckId/study" element={<StudyScreen />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Q')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
    expect(screen.getByText('A')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /easy/i }));
    expect(await screen.findByText(/all done/i)).toBeInTheDocument();
  });
});
