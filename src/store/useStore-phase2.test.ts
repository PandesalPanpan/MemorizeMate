import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

function fresh() { return createStore(new IndexedDbRepository('s2-' + Math.random())); }

describe('store phase 2', () => {
  let s: ReturnType<typeof fresh>;
  beforeEach(() => { s = fresh(); });

  it('creates a deck with a chosen color and no emoji', async () => {
    const d = await s.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    expect(d.color).toBe('sage');
    expect(d.icon).toBeUndefined();
  });

  it('updates and deletes a card', async () => {
    const d = await s.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    const c = await s.getState().addCard({ deckId: d.id, type: 'basic', front: 'q', back: 'a', tags: [] });
    await s.getState().updateCard({ ...c, front: 'Q2' });
    expect((await s.getState().repo.getCard(c.id))!.front).toBe('Q2');
    await s.getState().deleteCard(c.id);
    expect(await s.getState().repo.getCard(c.id)).toBeUndefined();
  });

  it('loseLife decrements and persists; manualUnlock restores', async () => {
    await s.getState().loadLives(1000);
    await s.getState().loseLife(2000);
    expect(s.getState().lives.current).toBe(9);
    await s.getState().manualUnlock(3000);
    expect(s.getState().lives.current).toBe(10);
    expect((await s.getState().repo.getLives()).current).toBe(10);
  });

  it('finishExam persists an attempt with a score', async () => {
    const d = await s.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    await s.getState().finishExam(d.id, [{ cardId: 'a', correct: true }, { cardId: 'b', correct: false }], 5000);
    const attempts = await s.getState().repo.listExamAttempts(d.id);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].score).toBe(0.5);
  });
});
