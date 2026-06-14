import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DeckPickerScreen } from './DeckPickerScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

const deckA = { id: 'a', name: 'Deck A', description: '', color: 'terracotta', desiredRetention: 0.9, createdAt: 1 };
const deckB = { id: 'b', name: 'Deck B', description: '', color: 'sage', desiredRetention: 0.9, createdAt: 2 };

function makeCard(id: string, deckId: string, dueDaysAgo: number) {
  return {
    id, deckId, type: 'basic' as const, front: 'q', back: 'a',
    srs: { due: new Date(Date.now() - dueDaysAgo * 86400000), reps: 1, lapses: 0, state: 2 as any, stability: 1, difficulty: 0.3, elapsed_days: 0, scheduled_days: 1, last_review: null },
    lapses: 0, leech: false, createdAt: 1,
  };
}

describe('DeckPickerScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('picker-' + Math.random()), decks: [deckA as any, deckB as any] });
  });

  it('renders checkboxes for each deck with due counts and start button', async () => {
    vi.spyOn(store.getState().repo, 'listCards').mockResolvedValue([
      makeCard('c1', 'a', 0), makeCard('c2', 'a', 2), makeCard('c3', 'b', 0),
    ] as any);

    render(<MemoryRouter><DeckPickerScreen /></MemoryRouter>);
    expect(screen.getByText('Choose decks to study')).toBeInTheDocument();
    expect(await screen.findByText('Deck A')).toBeInTheDocument();
    expect(screen.getByText('Deck B')).toBeInTheDocument();
    expect(screen.getByText(/Start session/i)).toBeInTheDocument();
  });

  it('toggles deck selection and updates button', async () => {
    vi.spyOn(store.getState().repo, 'listCards').mockResolvedValue([
      makeCard('c1', 'a', 0),
    ] as any);

    render(<MemoryRouter><DeckPickerScreen /></MemoryRouter>);
    expect(await screen.findByText('Deck A')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
  });

  it('navigates to study with selected deck ids on start', async () => {
    vi.spyOn(store.getState().repo, 'listCards').mockResolvedValue([
      makeCard('c1', 'a', 0), makeCard('c2', 'b', 0),
    ] as any);

    render(
      <MemoryRouter initialEntries={['/study/pick']}>
        <Routes>
          <Route path="/study/pick" element={<DeckPickerScreen />} />
          <Route path="/study" element={<div>Studying</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Deck A');
    await userEvent.click(screen.getByRole('button', { name: /start session/i }));
    expect(await screen.findByText('Studying')).toBeInTheDocument();
  });
});
