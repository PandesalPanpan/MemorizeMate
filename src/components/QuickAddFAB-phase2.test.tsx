import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QuickAddFAB } from './QuickAddFAB';
import { store } from '../store/useStore';

describe('QuickAddFAB — phase 2', () => {
  beforeEach(async () => {
    store.setState({ decks: [] });
  });

  it('returns null when no decks exist', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <QuickAddFAB />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('hidden on /study path', async () => {
    store.setState({ decks: [] });
    await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    const { container } = render(
      <MemoryRouter initialEntries={['/study']}>
        <QuickAddFAB />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('hidden on /exam path', async () => {
    store.setState({ decks: [] });
    await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    const { container } = render(
      <MemoryRouter initialEntries={['/exam']}>
        <QuickAddFAB />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('hidden on /cards/new path', async () => {
    store.setState({ decks: [] });
    await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    const { container } = render(
      <MemoryRouter initialEntries={['/cards/new']}>
        <QuickAddFAB />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('opens deck picker menu with multiple decks', async () => {
    store.setState({ decks: [] });
    await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    await store.getState().createDeck({ name: 'Math', description: '', color: 'plum' });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<QuickAddFAB />} />
          <Route path="/decks/:deckId/cards/new" element={<div>Editor Open</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add card/i }));
    expect(screen.getByText('Add card to…')).toBeInTheDocument();
    expect(screen.getByText('Bio')).toBeInTheDocument();
    expect(screen.getByText('Math')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Math'));
    expect(await screen.findByText('Editor Open')).toBeInTheDocument();
  });

  it('navigates directly when on a deck context route', async () => {
    store.setState({ decks: [] });
    await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    const deckId = store.getState().decks[0].id;

    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}`]}>
        <Routes>
          <Route path="/decks/:deckId" element={<QuickAddFAB />} />
          <Route path="/decks/:deckId/cards/new" element={<div>Editor Open</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add card/i }));
    expect(await screen.findByText('Editor Open')).toBeInTheDocument();
  });
});
