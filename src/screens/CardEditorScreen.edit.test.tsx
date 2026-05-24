import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CardEditorScreen } from './CardEditorScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('CardEditorScreen edit mode', () => {
  let deckId = '', cardId = '';
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('edit-' + Math.random()), decks: [] });
    const d = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    deckId = d.id;
    const c = await store.getState().addCard({ deckId, type: 'basic', front: 'Original', back: 'A', tags: [] });
    cardId = c.id;
  });

  it('pre-fills an existing card and saves edits', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/cards/${cardId}`]}>
        <Routes><Route path="/decks/:deckId/cards/:cardId" element={<CardEditorScreen />} /></Routes>
      </MemoryRouter>,
    );
    const front = await screen.findByDisplayValue('Original');
    await userEvent.clear(front);
    await userEvent.type(front, 'Edited');
    await userEvent.click(screen.getByRole('button', { name: /save card/i }));
    expect((await store.getState().repo.getCard(cardId))!.front).toBe('Edited');
  });
});
