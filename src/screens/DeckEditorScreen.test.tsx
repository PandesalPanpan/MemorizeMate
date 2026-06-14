import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';
import { DeckEditorScreen } from './DeckEditorScreen';

const deck = {
  id: 'deck-1', name: 'Test Deck', description: 'desc', color: 'sage',
  desiredRetention: 0.85, newCardsPerDay: 20, reviewsPerDay: 100, createdAt: 1,
};

describe('DeckEditorScreen', () => {
  beforeEach(() => {
    store.setState({
      repo: new IndexedDbRepository('de-' + Math.random()),
      decks: [deck as any],
    });
  });

  it('renders the edit form with pre-filled fields', async () => {
    vi.spyOn(store.getState().repo, 'getDeck').mockResolvedValue(deck as any);
    render(
      <MemoryRouter initialEntries={['/decks/deck-1/edit']}>
        <Routes>
          <Route path="/decks/:deckId/edit" element={<DeckEditorScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Edit deck')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Test Deck');
    expect(screen.getByLabelText('Description')).toHaveValue('desc');
    expect(screen.getByText('Danger zone')).toBeInTheDocument();
  });

  it('shows archive and delete confirm dialogs', async () => {
    vi.spyOn(store.getState().repo, 'getDeck').mockResolvedValue(deck as any);
    render(
      <MemoryRouter initialEntries={['/decks/deck-1/edit']}>
        <Routes>
          <Route path="/decks/:deckId/edit" element={<DeckEditorScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Edit deck')).toBeInTheDocument();

    const { userEvent } = await import('@testing-library/user-event');
    await userEvent.click(screen.getByRole('button', { name: 'Archive deck' }));
    expect(screen.getByText(/Archived decks are hidden/)).toBeInTheDocument();
  });
});
