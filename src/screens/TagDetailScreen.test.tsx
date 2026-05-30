import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TagDetailScreen } from './TagDetailScreen';
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

function mkDeck(id: string, name: string, color: Deck['color'] = 'terracotta'): Deck {
  return {
    id, name, description: '', color, desiredRetention: 0.9, createdAt: 0,
  };
}

describe('TagDetailScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('tagdetail-' + Math.random()) });
  });

  it('shows empty state when no cards have the tag', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Deck'));
    await repo.putCard(mkCard('c1', 'd1', ['science']));

    render(
      <MemoryRouter initialEntries={['/tags/biology']}>
        <Routes>
          <Route path="/tags/:tagName" element={<TagDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('No cards with this tag.')).toBeInTheDocument();
  });

  it('shows cards that have the matching tag', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', ['biology'], 'Mitochondria'));
    await repo.putCard(mkCard('c2', 'd1', ['science'], 'Ribosome'));

    render(
      <MemoryRouter initialEntries={['/tags/biology']}>
        <Routes>
          <Route path="/tags/:tagName" element={<TagDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Mitochondria')).toBeInTheDocument();
    expect(screen.queryByText('Ribosome')).not.toBeInTheDocument();
  });

  it('shows deck name and color dot for each card', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology', 'sage'));
    await repo.putCard(mkCard('c1', 'd1', ['biology'], 'Mitochondria'));

    render(
      <MemoryRouter initialEntries={['/tags/biology']}>
        <Routes>
          <Route path="/tags/:tagName" element={<TagDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Biology')).toBeInTheDocument();
  });

  it('links each card to its detail page', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', ['biology'], 'Mitochondria'));

    render(
      <MemoryRouter initialEntries={['/tags/biology']}>
        <Routes>
          <Route path="/tags/:tagName" element={<TagDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    const link = await screen.findByRole('link', { name: /mitochondria/i });
    expect(link).toHaveAttribute('href', '/decks/d1/cards/c1');
  });

  it('shows due status for cards that are due', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', ['biology'], 'Mitochondria'));

    render(
      <MemoryRouter initialEntries={['/tags/biology']}>
        <Routes>
          <Route path="/tags/:tagName" element={<TagDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    // New cards have reps=0, so they show as "New"
    expect(await screen.findByText('New')).toBeInTheDocument();
  });
});
