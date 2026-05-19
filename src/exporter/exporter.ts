import Papa from 'papaparse';
import type { Deck, Card } from '../types/models';

export function toJSON(decks: Deck[], cards: Card[]): string {
  return JSON.stringify({ version: 1, exportedAt: Date.now(), decks, cards }, null, 2);
}

export function toCSV(cards: Card[]): string {
  const rows = cards.map((c) => ({ front: c.front, back: c.back, tags: c.tags.join(',') }));
  return Papa.unparse({ fields: ['front', 'back', 'tags'], data: rows });
}
