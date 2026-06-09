import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DeckDetailScreen } from './DeckDetailScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';
import { newCard } from '../fsrs/scheduler';
import type { Card, Deck } from '../types/models';

function mkCard(id: string, deckId: string, front = 'Card front'): Card {
  return {
    id, deckId, type: 'basic', front, back: 'back',
    srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0,
  };
}

function mkDeck(id: string, name: string): Deck {
  return {
    id, name, description: '', color: 'terracotta', desiredRetention: 0.9, createdAt: 0,
  };
}

describe('DeckDetailScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('deck-' + Math.random()) });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('shows cards in the deck', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', 'Mitochondria'));
    await repo.putCard(mkCard('c2', 'd1', 'Ribosome'));

    render(
      <MemoryRouter initialEntries={['/decks/d1']}>
        <Routes>
          <Route path="/decks/:deckId" element={<DeckDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Mitochondria')).toBeInTheDocument();
    expect(screen.getByText('Ribosome')).toBeInTheDocument();
  });

  it('filters cards with a search query', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', 'Mitochondria'));
    await repo.putCard(mkCard('c2', 'd1', 'Bacteria'));

    render(
      <MemoryRouter initialEntries={['/decks/d1']}>
        <Routes>
          <Route path="/decks/:deckId" element={<DeckDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Mitochondria')).toBeInTheDocument();
    expect(screen.getByText('Bacteria')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Search…');
    await userEvent.type(searchInput, 'mito');

    expect(screen.getByText('Mitochondria')).toBeInTheDocument();
    expect(screen.queryByText('Bacteria')).not.toBeInTheDocument();
  });

  it('exports just this deck as JSON when Export is clicked', async () => {
    const captured: { current: string | null } = { current: null };
    const realBlob = global.Blob;
    vi.stubGlobal('Blob', class FakeBlob extends realBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        super(parts, opts);
        captured.current = parts.map(String).join('');
      }
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} });

    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Biology'));
    await repo.putCard(mkCard('c1', 'd1', 'Mitochondria'));

    render(
      <MemoryRouter initialEntries={['/decks/d1']}>
        <Routes>
          <Route path="/decks/:deckId" element={<DeckDetailScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(await screen.findByRole('button', { name: /^export$/i }));

    await waitFor(() => {
      expect(captured.current).not.toBeNull();
    });
    const payload = JSON.parse(captured.current!);
    expect(payload.decks).toHaveLength(1);
    expect(payload.decks[0].id).toBe('d1');
    expect(payload.cards.every((c: { deckId: string }) => c.deckId === 'd1')).toBe(true);
  });
});
