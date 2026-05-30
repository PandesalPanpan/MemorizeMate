import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SearchScreen } from './SearchScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';
import { newCard } from '../fsrs/scheduler';
import type { Card, Deck } from '../types/models';

function mkCard(id: string, deckId: string, front: string, back: string): Card {
  return {
    id, deckId, type: 'basic', front, back, tags: [],
    srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0,
  };
}

function mkDeck(id: string, name: string): Deck {
  return {
    id, name, description: '', color: 'terracotta', desiredRetention: 0.9, createdAt: 0,
  };
}

describe('SearchScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('search-' + Math.random()) });
  });

  it('shows initial state when query is empty', async () => {
    render(<MemoryRouter><SearchScreen /></MemoryRouter>);
    expect(screen.getByText('Search across all your decks and cards')).toBeInTheDocument();
  });

  it('shows deck results when deck name matches', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putDeck(mkDeck('d2', 'Chemistry'));

    render(<MemoryRouter><SearchScreen /></MemoryRouter>);
    const input = screen.getByPlaceholderText('Search all cards…');
    await userEvent.type(input, 'bio');

    // Wait for debounced search to complete
    const link = await screen.findByRole('link', { name: /biology/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/decks/d1');
  });

  it('shows card results when card front matches', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', 'Mitochondria', 'powerhouse'));
    await repo.putCard(mkCard('c2', 'd1', 'Ribosome', 'protein synthesis'));

    render(<MemoryRouter><SearchScreen /></MemoryRouter>);
    const input = screen.getByPlaceholderText('Search all cards…');
    await userEvent.type(input, 'mito');

    const link = await screen.findByRole('link', { name: /mitochondria/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/decks/d1/cards/c1');
  });

  it('shows no results when nothing matches', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', 'Mitochondria', 'powerhouse'));

    render(<MemoryRouter><SearchScreen /></MemoryRouter>);
    const input = screen.getByPlaceholderText('Search all cards…');
    await userEvent.type(input, 'zzz_nonexistent');

    expect(await screen.findByText('No results')).toBeInTheDocument();
  });

  it('clears results when query is cleared', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', 'Mitochondria', 'powerhouse'));

    render(<MemoryRouter><SearchScreen /></MemoryRouter>);
    const input = screen.getByPlaceholderText('Search all cards…');
    await userEvent.type(input, 'mito');

    // Wait for results
    await screen.findByText('Mitochondria');

    // Clear the search
    await userEvent.click(screen.getByLabelText('Clear search'));

    expect(screen.getByText('Search across all your decks and cards')).toBeInTheDocument();
  });
});
