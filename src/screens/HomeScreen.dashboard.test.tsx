import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeScreen } from './HomeScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('HomeScreen dashboard', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('homed-' + Math.random()), decks: [] });
  });

  it('shows a due-today total', async () => {
    const d = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    await store.getState().addCard({ deckId: d.id, type: 'basic', front: 'q', back: 'a', tags: [] });
    await store.getState().load();
    render(<MemoryRouter><HomeScreen /></MemoryRouter>);
    expect(await screen.findByText(/due today/i)).toBeInTheDocument();
  });

  it('links to multi-deck study when two decks have due cards', async () => {
    const d1 = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    const d2 = await store.getState().createDeck({ name: 'Chem', description: '', color: 'rose' });
    await store.getState().addCard({ deckId: d1.id, type: 'basic', front: 'q1', back: 'a1', tags: [] });
    await store.getState().addCard({ deckId: d2.id, type: 'basic', front: 'q2', back: 'a2', tags: [] });
    await store.getState().load();
    render(<MemoryRouter><HomeScreen /></MemoryRouter>);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /study all due/i });
      expect(link).toHaveAttribute('href', `/study?deckIds=${d1.id},${d2.id}`);
    });
  });

  it('links to single-deck study when only one deck has due cards', async () => {
    const d1 = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    const d2 = await store.getState().createDeck({ name: 'Chem', description: '', color: 'rose' });
    await store.getState().addCard({ deckId: d1.id, type: 'basic', front: 'q1', back: 'a1', tags: [] });
    // d2 has no cards, so no due cards
    await store.getState().load();
    render(<MemoryRouter><HomeScreen /></MemoryRouter>);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /study all due/i });
      expect(link).toHaveAttribute('href', `/decks/${d1.id}/study`);
    });
  });
});
