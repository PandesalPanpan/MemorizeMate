import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ExamScreen } from './ExamScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('ExamScreen', () => {
  let deckId = '';
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('exam-' + Math.random()), decks: [], lives: { current: 10, lastEventAt: Date.now() } });
    const d = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    deckId = d.id;
    await store.getState().addCard({ deckId, type: 'basic', front: 'Q1', back: 'A1', tags: [] });
  });

  it('runs a one-card exam, records a result, and shows a score', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/exam`]}>
        <Routes><Route path="/decks/:deckId/exam" element={<ExamScreen />} /></Routes>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /start exam/i }));
    await userEvent.click(await screen.findByRole('button', { name: /show answer/i }));
    await userEvent.click(screen.getByRole('button', { name: /got it right/i }));
    expect(await screen.findByText(/your score/i)).toBeInTheDocument();
    const attempts = await store.getState().repo.listExamAttempts(deckId);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].score).toBe(1);
  });
});
