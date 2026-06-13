import type { Card, ExamAttempt, ExamResult } from '../types/models';

/** Count how often each card was answered wrong across prior attempts. */
function missCounts(prior: ExamAttempt[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of prior) {
    for (const r of a.results) {
      if (!r.correct) m.set(r.cardId, (m.get(r.cardId) ?? 0) + 1);
    }
  }
  return m;
}

/** Order cards so frequently-missed ones come first; ties keep input order. */
export function orderExamCards(cards: Card[], prior: ExamAttempt[]): Card[] {
  const miss = missCounts(prior);
  return cards.toSorted((a, b) => (miss.get(b.id) ?? 0) - (miss.get(a.id) ?? 0));
}

export function scoreAttempt(results: ExamResult[]): number {
  if (results.length === 0) return 0;
  return results.filter((r) => r.correct).length / results.length;
}
