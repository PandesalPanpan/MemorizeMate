import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DonationScreen } from './DonationScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('DonationScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('don-' + Math.random()), lives: { current: 0, lastEventAt: Date.now() } });
  });

  it('shows the GCash number and unlocks without donating', async () => {
    render(
      <MemoryRouter initialEntries={['/unlock']}>
        <Routes>
          <Route path="/unlock" element={<DonationScreen />} />
          <Route path="/decks" element={<div>Decks Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/0976 429 5810/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /unlock without donating/i }));
    expect(await screen.findByText('Decks Page')).toBeInTheDocument();
    expect(store.getState().lives.current).toBe(10);
  });
});
