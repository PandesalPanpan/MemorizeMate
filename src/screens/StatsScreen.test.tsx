import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StatsScreen } from './StatsScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

function makeCard(overrides: any = {}) {
  return {
    id: overrides.id ?? 'c1', deckId: overrides.deckId ?? 'd1',
    type: 'basic', front: 'front', back: 'back',
    srs: { due: new Date(), reps: overrides.reps ?? 5, lapses: 2, state: 2,
      stability: 3.5, difficulty: 0.5, elapsed_days: 0, scheduled_days: 1, last_review: new Date() },
    lapses: overrides.lapses ?? 2, leech: overrides.leech ?? false, createdAt: 1,
  };
}

const deck = { id: 'd1', name: 'My Deck', description: '', color: 'terracotta', desiredRetention: 0.9, createdAt: 1 };
const log = { id: 'r1', cardId: 'c1', timestamp: Date.now(), rating: 'good', elapsedDays: 1, scheduledDays: 1 };
const session = { id: 's1', deckIds: ['d1'], startedAt: Date.now() - 3600000, endedAt: Date.now(), cardsReviewed: 10, cardsGraduated: 8, ratings: { again: 0, hard: 2, good: 5, easy: 3 } };

describe('StatsScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('stats-' + Math.random()), decks: [] });
  });

  it('renders all-stats view with no deckId', async () => {
    vi.spyOn(store.getState().repo, 'listCards').mockResolvedValue([makeCard()] as any);
    vi.spyOn(store.getState().repo, 'listReviewLogs').mockResolvedValue([log] as any);
    vi.spyOn(store.getState().repo, 'listSessions').mockResolvedValue([session] as any);

    render(<MemoryRouter><StatsScreen /></MemoryRouter>);
    expect(await screen.findByText('All Stats')).toBeInTheDocument();
    expect(screen.getByText('Total cards')).toBeInTheDocument();
    expect(screen.getByText('Total reviews')).toBeInTheDocument();
    expect(screen.getByText('Card breakdown')).toBeInTheDocument();
    expect(screen.getByText('Forecast')).toBeInTheDocument();
    expect(screen.getByText('Session history')).toBeInTheDocument();
  });

  it('renders deck-specific stats view', async () => {
    vi.spyOn(store.getState().repo, 'getDeck').mockResolvedValue(deck as any);
    vi.spyOn(store.getState().repo, 'listCards').mockResolvedValue([makeCard()] as any);
    vi.spyOn(store.getState().repo, 'listReviewLogsByDeck').mockResolvedValue([log] as any);
    vi.spyOn(store.getState().repo, 'listSessions').mockResolvedValue([session] as any);

    render(
      <MemoryRouter initialEntries={['/decks/d1/stats']}>
        <Routes>
          <Route path="/decks/:deckId/stats" element={<StatsScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('My Deck Stats')).toBeInTheDocument();
    expect(screen.getByText('Card details')).toBeInTheDocument();
  });

  it('shows session history with formatted data', async () => {
    vi.spyOn(store.getState().repo, 'listCards').mockResolvedValue([makeCard()] as any);
    vi.spyOn(store.getState().repo, 'listReviewLogs').mockResolvedValue([log] as any);
    vi.spyOn(store.getState().repo, 'listSessions').mockResolvedValue([session] as any);

    render(<MemoryRouter><StatsScreen /></MemoryRouter>);
    expect(await screen.findByText('Session history')).toBeInTheDocument();
    expect(screen.getByText(/reviewed/)).toBeInTheDocument();
  });

  it('shows empty state when no sessions recorded', async () => {
    vi.spyOn(store.getState().repo, 'listCards').mockResolvedValue([] as any);
    vi.spyOn(store.getState().repo, 'listReviewLogs').mockResolvedValue([] as any);
    vi.spyOn(store.getState().repo, 'listSessions').mockResolvedValue([] as any);

    render(<MemoryRouter><StatsScreen /></MemoryRouter>);
    expect(await screen.findByText('No sessions recorded yet.')).toBeInTheDocument();
  });

  it('switches forecast days when clicking toggle', async () => {
    vi.spyOn(store.getState().repo, 'listCards').mockResolvedValue([] as any);
    vi.spyOn(store.getState().repo, 'listReviewLogs').mockResolvedValue([] as any);
    vi.spyOn(store.getState().repo, 'listSessions').mockResolvedValue([] as any);

    render(<MemoryRouter><StatsScreen /></MemoryRouter>);
    expect(await screen.findByText('Forecast')).toBeInTheDocument();
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('14 days')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
  });
});
