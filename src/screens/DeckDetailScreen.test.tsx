import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DeckDetailScreen } from './DeckDetailScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';
import { newCard } from '../fsrs/scheduler';
import type { Card, Deck } from '../types/models';

function mkCard(id: string, deckId: string, tags: string[], front = 'Card front'): Card {
  return {
    id, deckId, type: 'basic', front, back: 'back', tags,
    srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0,
  };
}

function mkDeck(id: string, name: string): Deck {
  return {
    id, name, description: '', color: 'terracotta', desiredRetention: 0.9, createdAt: 0,
  };
}

describe('DeckDetailScreen tag filtering', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('decktag-' + Math.random()) });
  });

  it('shows tag filter chips for deck tags', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', ['science'], 'Mitochondria'));
    await repo.putCard(mkCard('c2', 'd1', ['biology'], 'Ribosome'));

    render(
      <MemoryRouter initialEntries={['/decks/d1']}>
        <Routes>
          <Route path="/decks/:deckId" element={<DeckDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    const scienceChip = await screen.findByRole('button', { name: 'science' });
    expect(scienceChip).toBeInTheDocument();
    const biologyChip = await screen.findByRole('button', { name: 'biology' });
    expect(biologyChip).toBeInTheDocument();
  });

  it('shows tag filter "All" button', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', ['science']));

    render(
      <MemoryRouter initialEntries={['/decks/d1']}>
        <Routes>
          <Route path="/decks/:deckId" element={<DeckDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    // There are two "All" buttons: one in the tag filter, one in CardList's filter
    const allButtons = await screen.findAllByRole('button', { name: 'All' });
    expect(allButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('filters cards when a tag chip is clicked', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', ['biology'], 'Mitochondria'));
    await repo.putCard(mkCard('c2', 'd1', ['science'], 'Ribosome'));

    render(
      <MemoryRouter initialEntries={['/decks/d1']}>
        <Routes>
          <Route path="/decks/:deckId" element={<DeckDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    // Both cards visible initially
    expect(await screen.findByText('Mitochondria')).toBeInTheDocument();
    expect(screen.getByText('Ribosome')).toBeInTheDocument();

    // Click the "biology" tag chip
    await userEvent.click(screen.getByRole('button', { name: 'biology' }));

    // Only biology-tagged card remains
    expect(screen.getByText('Mitochondria')).toBeInTheDocument();
    expect(screen.queryByText('Ribosome')).not.toBeInTheDocument();
  });

  it('shows all cards again when "All" is clicked after filtering', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', ['biology'], 'Mitochondria'));
    await repo.putCard(mkCard('c2', 'd1', ['science'], 'Ribosome'));

    render(
      <MemoryRouter initialEntries={['/decks/d1']}>
        <Routes>
          <Route path="/decks/:deckId" element={<DeckDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    // Filter by biology
    await userEvent.click(await screen.findByRole('button', { name: 'biology' }));
    expect(screen.queryByText('Ribosome')).not.toBeInTheDocument();

    // Click the first "All" button (tag filter's All)
    const allButtons = screen.getAllByRole('button', { name: 'All' });
    await userEvent.click(allButtons[0]);
    expect(screen.getByText('Mitochondria')).toBeInTheDocument();
    expect(screen.getByText('Ribosome')).toBeInTheDocument();
  });

  it('combines tag filter with search query', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', ['biology'], 'Mitochondria'));
    await repo.putCard(mkCard('c2', 'd1', ['biology'], 'Bacteria'));

    render(
      <MemoryRouter initialEntries={['/decks/d1']}>
        <Routes>
          <Route path="/decks/:deckId" element={<DeckDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    // Filter by biology tag
    await userEvent.click(await screen.findByRole('button', { name: 'biology' }));
    expect(screen.getByText('Mitochondria')).toBeInTheDocument();
    expect(screen.getByText('Bacteria')).toBeInTheDocument();

    // Type search to narrow further
    const searchInput = screen.getByPlaceholderText('Search cards…');
    await userEvent.type(searchInput, 'mito');

    expect(screen.getByText('Mitochondria')).toBeInTheDocument();
    expect(screen.queryByText('Bacteria')).not.toBeInTheDocument();
  });
});
