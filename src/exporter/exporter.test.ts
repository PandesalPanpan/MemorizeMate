import { describe, it, expect } from 'vitest';
import { toJSON, toCSV, exportDecks } from './exporter';
import type { Deck, Card } from '../types/models';
import { newCard } from '../fsrs/scheduler';

const deck: Deck = {
  id: 'd1', name: 'Bio', description: '', color: 'terracotta', icon: '🧬',
  desiredRetention: 0.9, createdAt: 0,
};
const card: Card = {
  id: 'c1', deckId: 'd1', type: 'basic', front: 'Dog', back: 'Perro',
  srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0,
};

const deck2: Deck = {
  id: 'd2', name: 'History', description: '', color: 'sage', icon: '📜',
  desiredRetention: 0.9, createdAt: 0,
};
const cardD2: Card = {
  id: 'c2', deckId: 'd2', type: 'basic', front: '1492', back: 'Columbus',
  srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0,
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
    expect(csv.split('\r\n')[0]).toBe('front,back');
    expect(csv).toContain('Dog,Perro');
  });

  it('exportDecks JSON includes only the selected deck and its cards', () => {
    const json = exportDecks([deck, deck2], [card, cardD2], ['d1'], 'json');
    const out = JSON.parse(json);
    expect(out.decks).toHaveLength(1);
    expect(out.decks[0].id).toBe('d1');
    expect(out.cards).toHaveLength(1);
    expect(out.cards[0].id).toBe('c1');
  });

  it('exportDecks JSON includes multiple selected decks', () => {
    const json = exportDecks([deck, deck2], [card, cardD2], ['d1', 'd2'], 'json');
    const out = JSON.parse(json);
    expect(out.decks.map((d: Deck) => d.id).sort()).toEqual(['d1', 'd2']);
    expect(out.cards).toHaveLength(2);
  });

  it('exportDecks CSV contains only the selected decks\' cards', () => {
    const csv = exportDecks([deck, deck2], [card, cardD2], ['d2'], 'csv');
    expect(csv).toContain('1492,Columbus');
    expect(csv).not.toContain('Dog');
  });

  it('exportDecks with empty selection returns an empty export', () => {
    const json = exportDecks([deck, deck2], [card, cardD2], [], 'json');
    const out = JSON.parse(json);
    expect(out.decks).toEqual([]);
    expect(out.cards).toEqual([]);
  });
});
