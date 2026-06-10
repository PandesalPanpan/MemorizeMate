import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CardEditorScreen } from './CardEditorScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('CardEditorScreen — new card', () => {
  let deckId = '';

  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('ce-' + Math.random()), decks: [] });
    const d = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    deckId = d.id;
  });

  it('creates a new basic card and redirects', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/cards/new`]}>
        <Routes>
          <Route path="/decks/:deckId/cards/new" element={<CardEditorScreen />} />
          <Route path="/decks/:deckId" element={<div>Back at deck</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('New card')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Front'), 'Q1');
    await userEvent.type(screen.getByLabelText('Back'), 'A1');
    await userEvent.click(screen.getByRole('button', { name: 'Save & done' }));
    expect(await screen.findByText('Back at deck')).toBeInTheDocument();
    const cards = await store.getState().repo.listCards(deckId);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe('Q1');
  });

  it('Save & add another keeps you on the form, clears fields, and shows confirmation', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/cards/new`]}>
        <Routes>
          <Route path="/decks/:deckId/cards/new" element={<CardEditorScreen />} />
          <Route path="/decks/:deckId" element={<div>Back at deck</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText('Front'), 'Q1');
    await userEvent.type(screen.getByLabelText('Back'), 'A1');
    await userEvent.click(screen.getByRole('button', { name: 'Save & add another' }));

    // Still on the form, confirmation shown (awaits the async save), fields cleared
    expect(await screen.findByText('Added ✓')).toBeInTheDocument();
    expect(screen.getByText('New card')).toBeInTheDocument();
    expect(screen.getByLabelText('Front')).toHaveValue('');
    expect(screen.getByLabelText('Back')).toHaveValue('');

    await userEvent.type(screen.getByLabelText('Front'), 'Q2');
    await userEvent.click(screen.getByRole('button', { name: 'Save & add another' }));
    const cards = await store.getState().repo.listCards(deckId);
    expect(cards).toHaveLength(2);
  });

  it('switches to cloze type and renders ClozeEditor', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/cards/new`]}>
        <Routes>
          <Route path="/decks/:deckId/cards/new" element={<CardEditorScreen />} />
          <Route path="/decks/:deckId" element={<div>Back at deck</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cloze' }));
    expect(screen.getByText(/Select text, then tap/)).toBeInTheDocument();
  });

  it('does nothing when save fails (error swallowed)', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/cards/new`]}>
        <Routes>
          <Route path="/decks/:deckId/cards/new" element={<CardEditorScreen />} />
          <Route path="/decks/:deckId" element={<div>Back at deck</div>} />
        </Routes>
      </MemoryRouter>,
    );
    vi.spyOn(store.getState(), 'addCard').mockRejectedValue(new Error('fail'));
    await userEvent.type(screen.getByLabelText('Front'), 'Q1');
    await userEvent.type(screen.getByLabelText('Back'), 'A1');
    await userEvent.click(screen.getByRole('button', { name: 'Save & done' }));
    expect(screen.getByText('New card')).toBeInTheDocument();
  });
});
