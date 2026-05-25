import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeScreen } from './HomeScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('HomeScreen dashboard', () => {
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('homed-' + Math.random()), decks: [] });
    const d = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    await store.getState().addCard({ deckId: d.id, type: 'basic', front: 'q', back: 'a', tags: [] });
    await store.getState().load();
  });

  it('shows a due-today total', async () => {
    render(<MemoryRouter><HomeScreen /></MemoryRouter>);
    expect(await screen.findByText(/due today/i)).toBeInTheDocument();
  });
});
