import { describe, it, expect } from 'vitest';
import { orderExamCards, scoreAttempt } from './examLogic';
import type { Card, ExamAttempt } from '../types/models';
import { newCard } from '../fsrs/scheduler';

function card(id: string): Card {
  return { id, deckId: 'd', type: 'basic', front: id, back: 'a', tags: [], srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0 };
}

describe('exam logic', () => {
  it('puts previously-missed cards first on a retake', () => {
    const cards = [card('a'), card('b'), card('c')];
    const prior: ExamAttempt[] = [
      { id: 'x', deckId: 'd', timestamp: 1, score: 0.5, results: [
        { cardId: 'a', correct: true }, { cardId: 'b', correct: false }, { cardId: 'c', correct: false },
      ] },
    ];
    const ordered = orderExamCards(cards, prior);
    expect(ordered.slice(0, 2).map((c) => c.id).sort()).toEqual(['b', 'c']);
  });

  it('with no history, returns all cards (order may be shuffled)', () => {
    const cards = [card('a'), card('b')];
    expect(orderExamCards(cards, []).map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('scores fraction correct', () => {
    expect(scoreAttempt([{ cardId: 'a', correct: true }, { cardId: 'b', correct: false }])).toBe(0.5);
    expect(scoreAttempt([])).toBe(0);
  });
});
