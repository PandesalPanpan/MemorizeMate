import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TagsScreen } from './TagsScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';
import { newCard } from '../fsrs/scheduler';
import type { Card, Deck } from '../types/models';

function mkCard(id: string, deckId: string, tags: string[]): Card {
  return {
    id, deckId, type: 'basic', front: id === 'c1' ? 'Card one' : 'Card two', back: 'back', tags,
    srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0,
  };
}

function mkDeck(id: string, name: string): Deck {
  return {
    id, name, description: '', color: 'terracotta', desiredRetention: 0.9, createdAt: 0,
  };
}

describe('TagsScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('tags-' + Math.random()) });
  });

  it('shows empty state when no cards have tags', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Deck'));
    await repo.putCard(mkCard('c1', 'd1', []));

    render(<MemoryRouter><TagsScreen /></MemoryRouter>);
    expect(await screen.findByText('No tags yet. Add tags to your cards to organize them.')).toBeInTheDocument();
  });

  it('renders tags with correct counts', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Deck'));
    await repo.putCard(mkCard('c1', 'd1', ['biology', 'science']));
    await repo.putCard(mkCard('c2', 'd1', ['biology']));

    render(<MemoryRouter><TagsScreen /></MemoryRouter>);

    // Each chip should show tag name and count
    const biologyChip = await screen.findByText((content) => content.startsWith('biology'));
    expect(biologyChip).toBeInTheDocument();
    const scienceChip = await screen.findByText((content) => content.startsWith('science'));
    expect(scienceChip).toBeInTheDocument();

    // biology should have count 2, science count 1
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('links to tag detail with URL-encoded tag name', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Deck'));
    await repo.putCard(mkCard('c1', 'd1', ['biology']));

    render(<MemoryRouter><TagsScreen /></MemoryRouter>);

    const link = await screen.findByRole('link', { name: /biology/ });
    expect(link).toHaveAttribute('href', '/tags/biology');
  });

  it('URL-encodes tags with special characters', async () => {
    const repo = store.getState().repo;
    await repo.putDeck(mkDeck('d1', 'Deck'));
    await repo.putCard(mkCard('c1', 'd1', ['physics 101']));

    render(<MemoryRouter><TagsScreen /></MemoryRouter>);

    const link = await screen.findByRole('link', { name: /physics/ });
    expect(link).toHaveAttribute('href', '/tags/physics%20101');
  });
});
