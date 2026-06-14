import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';
import { DeckEditorScreen } from './DeckEditorScreen';

const deck = { id: 'deck-1', name: 'Test Deck', description: 'desc', color: 'sage' as const, desiredRetention: 0.85, newCardsPerDay: 20, reviewsPerDay: 100, createdAt: 1 };

describe('DeckEditorScreen — phase 2', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('de2-' + Math.random()), decks: [] });
  });

  it('calls archiveDeck on archive confirm', async () => {
    store.setState({ decks: [deck as any] });
    vi.spyOn(store.getState().repo, 'getDeck').mockResolvedValue(deck as any);
    const archiveSpy = vi.spyOn(store.getState(), 'archiveDeck').mockResolvedValue(undefined as any);
    const removeSpy = vi.spyOn(store.getState(), 'removeDeck').mockResolvedValue(undefined as any);
    render(
      <MemoryRouter initialEntries={['/decks/deck-1/edit']}>
        <Routes>
          <Route path="/decks/:deckId/edit" element={<DeckEditorScreen />} />
          <Route path="/decks" element={<div>Decks page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Edit deck')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Archive deck' }));
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByText('Decks page')).toBeInTheDocument();
    expect(archiveSpy).toHaveBeenCalledWith('deck-1');
  });

  it('calls removeDeck on delete confirm and navigates to /decks', async () => {
    store.setState({ decks: [deck as any] });
    vi.spyOn(store.getState().repo, 'getDeck').mockResolvedValue(deck as any);
    const removeSpy = vi.spyOn(store.getState(), 'removeDeck').mockResolvedValue(undefined as any);
    render(
      <MemoryRouter initialEntries={['/decks/deck-1/edit']}>
        <Routes>
          <Route path="/decks/:deckId/edit" element={<DeckEditorScreen />} />
          <Route path="/decks" element={<div>Decks page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Edit deck')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete deck' }));
    // After dialog opens there are now two "Delete deck" buttons - click confirm
    const deleteBtns = screen.getAllByRole('button', { name: 'Delete deck' });
    await userEvent.click(deleteBtns[1]);
    // Navigation to /decks happens after removeDeck resolves
    await expect.poll(() => removeSpy).toHaveBeenCalledWith('deck-1');
    expect(await screen.findByText('Decks page')).toBeInTheDocument();
    expect(await screen.findByText('Decks page')).toBeInTheDocument();
    expect(removeSpy).toHaveBeenCalledWith('deck-1');
  });

  it('saves updated deck fields and navigates to deck detail', async () => {
    store.setState({ decks: [deck as any] });
    vi.spyOn(store.getState().repo, 'getDeck').mockResolvedValue(deck as any);
    const updateSpy = vi.spyOn(store.getState(), 'updateDeck').mockResolvedValue(undefined as any);
    render(
      <MemoryRouter initialEntries={['/decks/deck-1/edit']}>
        <Routes>
          <Route path="/decks/:deckId/edit" element={<DeckEditorScreen />} />
          <Route path="/decks/:deckId" element={<div>Deck detail</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Edit deck')).toBeInTheDocument();
    const nameInput = screen.getByLabelText('Name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Renamed Deck');
    const descInput = screen.getByLabelText('Description');
    await userEvent.clear(descInput);
    await userEvent.type(descInput, 'New desc');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Deck detail')).toBeInTheDocument();
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Renamed Deck', description: 'New desc' }));
  });

  it('shows Loading when deck is null', async () => {
    vi.spyOn(store.getState().repo, 'getDeck').mockResolvedValue(undefined as any);
    render(
      <MemoryRouter initialEntries={['/decks/deck-1/edit']}>
        <Routes>
          <Route path="/decks/:deckId/edit" element={<DeckEditorScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Loading…')).toBeInTheDocument();
  });

  it('sets empty string for no newCardsPerDay and reviewsPerDay', async () => {
    const deckNoLimits = { ...deck, newCardsPerDay: undefined as any, reviewsPerDay: undefined as any };
    store.setState({ decks: [deckNoLimits as any] });
    vi.spyOn(store.getState().repo, 'getDeck').mockResolvedValue(deckNoLimits as any);
    render(
      <MemoryRouter initialEntries={['/decks/deck-1/edit']}>
        <Routes>
          <Route path="/decks/:deckId/edit" element={<DeckEditorScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Edit deck')).toBeInTheDocument();
    const newCards = screen.getByLabelText('New cards per day') as HTMLInputElement;
    const reviews = screen.getByLabelText('Reviews per day') as HTMLInputElement;
    expect(newCards.value).toBe('');
    expect(reviews.value).toBe('');
  });
});
