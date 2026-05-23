import { describe, it, expect } from 'vitest';
import { toJSON, toCSV } from './exporter';
import type { Deck, Card } from '../types/models';
import { newCard } from '../fsrs/scheduler';

const deck: Deck = {
  id: 'd1', name: 'Bio', description: '', color: 'terracotta', icon: '🧬',
  desiredRetention: 0.9, createdAt: 0,
};
const card: Card = {
  id: 'c1', deckId: 'd1', type: 'basic', front: 'Dog', back: 'Perro',
  tags: ['animals'], srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0,
};

describe('exporter', () => {
  it('serializes a full backup to JSON with version', () => {
    const out = JSON.parse(toJSON([deck], [card]));
    expect(out.version).toBe(1);
    expect(out.decks[0].name).toBe('Bio');
    expect(out.cards[0].front).toBe('Dog');
  });

  it('exports basic cards to CSV with header', () => {
    const csv = toCSV([card]);
    expect(csv.split('\r\n')[0]).toBe('front,back,tags');
    expect(csv).toContain('Dog,Perro,animals');
  });
});
