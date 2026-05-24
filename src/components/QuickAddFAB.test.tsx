import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QuickAddFAB } from './QuickAddFAB';
import { store } from '../store/useStore';

describe('QuickAddFAB', () => {
  beforeEach(async () => {
    store.setState({ decks: [] });
    await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
  });

  it('navigates to the most-recent deck card editor', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<QuickAddFAB />} />
          <Route path="/decks/:deckId/cards/new" element={<div>Editor Open</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /add card/i }));
    expect(await screen.findByText('Editor Open')).toBeInTheDocument();
  });
});
