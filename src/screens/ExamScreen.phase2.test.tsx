import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ExamScreen } from './ExamScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

function makeCard(id: string, deckId: string, front: string, back: string) {
  return {
    id, deckId, type: 'basic' as const, front, back,
    srs: { due: new Date(0), reps: 0, lapses: 0, state: 0 as any, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, last_review: null },
    lapses: 0, leech: false, createdAt: 1,
  };
}

describe('ExamScreen — phase 2', () => {
  let deckId = '';

  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('ex2-' + Math.random()), decks: [] });
    const d = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    deckId = d.id;
  });

  it('stays on intro when start fails (no deckId)', async () => {
    render(
      <MemoryRouter initialEntries={['/exam']}>
        <Routes>
          <Route path="/exam" element={<ExamScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /start exam/i }));
    expect(screen.getByText('Exam mode')).toBeInTheDocument();
  });

  it('shows "No cards to examine" when queue is empty', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/exam`]}>
        <Routes><Route path="/decks/:deckId/exam" element={<ExamScreen />} /></Routes>
      </MemoryRouter>,
    );
    // Skip the async start flow by directly setting phase but we need cards.
    // The intro → running redirect only works with cards. Let's mock the start flow directly.
    // Actually: start() calls listCards which returns []. orderExamCards([], []) = [].
    // So queue will be empty, phase = 'running', i=0, queue[0] = undefined → shows "No cards to examine."
    await userEvent.click(await screen.findByRole('button', { name: /start exam/i }));
    expect(await screen.findByText('No cards to examine.')).toBeInTheDocument();
  });

  it('answers wrong via keyboard shortcut 1', async () => {
    await store.getState().addCard({ deckId, type: 'basic', front: 'Q1', back: 'A1', tags: [] });
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/exam`]}>
        <Routes><Route path="/decks/:deckId/exam" element={<ExamScreen />} /></Routes>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /start exam/i }));
    await userEvent.click(await screen.findByRole('button', { name: /show answer/i }));
    // Press 1 = wrong
    await userEvent.keyboard('1');
    expect(await screen.findByText(/your score/i)).toBeInTheDocument();
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('navigates next card correctly', async () => {
    await store.getState().addCard({ deckId, type: 'basic', front: 'Q1', back: 'A1', tags: [] });
    await store.getState().addCard({ deckId, type: 'basic', front: 'Q2', back: 'A2', tags: [] });
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/exam`]}>
        <Routes><Route path="/decks/:deckId/exam" element={<ExamScreen />} /></Routes>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /start exam/i }));
    // Verify we see 1 / 2 count and can advance to next card
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
    await userEvent.click(screen.getByRole('button', { name: /got it right/i }));
    // Now on card 2 — count should be 2 / 2
    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
  });

  it('handles cloze card in exam', async () => {
    await store.getState().addCard({ deckId, type: 'cloze', front: 'The {{c1:capital}} of France is Paris', back: '', tags: [] });
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/exam`]}>
        <Routes><Route path="/decks/:deckId/exam" element={<ExamScreen />} /></Routes>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /start exam/i }));
    // Cloze question shows raw text before reveal
    expect(screen.getByText(/capital/)).toBeInTheDocument();
    expect(screen.getByText(/France/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
    // After reveal, cloze shows answer
    expect(screen.getByText(/capital/)).toBeInTheDocument();
  });

  it('applies results to schedule and returns to intro', async () => {
    await store.getState().addCard({ deckId, type: 'basic', front: 'Q1', back: 'A1', tags: [] });
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/exam`]}>
        <Routes><Route path="/decks/:deckId/exam" element={<ExamScreen />} /></Routes>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /start exam/i }));
    await userEvent.click(await screen.findByRole('button', { name: /show answer/i }));
    await userEvent.click(screen.getByRole('button', { name: /got it right/i }));
    expect(await screen.findByText(/exam complete/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /apply to my schedule/i }));
    expect(await screen.findByText('Exam mode')).toBeInTheDocument();
  });

  it('keeps schedule unchanged', async () => {
    await store.getState().addCard({ deckId, type: 'basic', front: 'Q1', back: 'A1', tags: [] });
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/exam`]}>
        <Routes><Route path="/decks/:deckId/exam" element={<ExamScreen />} /></Routes>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /start exam/i }));
    await userEvent.click(await screen.findByRole('button', { name: /show answer/i }));
    await userEvent.click(screen.getByRole('button', { name: /got it right/i }));
    expect(await screen.findByText(/exam complete/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /keep schedule unchanged/i }));
    expect(await screen.findByText('Exam mode')).toBeInTheDocument();
  });
});
