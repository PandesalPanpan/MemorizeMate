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

  it('shows the GCash number and unlocks with any amount', async () => {
    render(
      <MemoryRouter initialEntries={['/unlock']}>
        <Routes>
          <Route path="/unlock" element={<DonationScreen />} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/0976 429 5810/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/how much/i), '0');
    await userEvent.click(screen.getByRole('button', { name: /unlock lives/i }));
    expect(await screen.findByText('Home Page')).toBeInTheDocument();
    expect(store.getState().lives.current).toBe(10);
  });

  it('shows an error for invalid amount', async () => {
    render(
      <MemoryRouter initialEntries={['/unlock']}>
        <Routes>
          <Route path="/unlock" element={<DonationScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/how much/i), 'abc');
    await userEvent.click(screen.getByRole('button', { name: /unlock lives/i }));
    expect(await screen.findByText(/valid amount/i)).toBeInTheDocument();
  });
});
