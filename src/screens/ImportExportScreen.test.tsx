import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ImportExportScreen } from './ImportExportScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('ImportExportScreen', () => {
  let deckId = '';
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('import-' + Math.random()), decks: [] });
    const deck = await store.getState().createDeck({ name: 'Bio', description: '' });
    deckId = deck.id;
  });

  it('previews parsed cards and imports them into the chosen deck', async () => {
    render(<MemoryRouter><ImportExportScreen /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/paste/i), 'Dog | Perro\nCat | Gato');
    expect(await screen.findByText(/2 cards detected/i)).toBeInTheDocument();
    expect(screen.getByText(/format: pipe/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /import/i }));
    await waitFor(async () => {
      const cards = await store.getState().repo.listCards(deckId);
      expect(cards).toHaveLength(2);
    });
  });
});
