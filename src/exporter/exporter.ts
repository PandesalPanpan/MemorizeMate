import Papa from 'papaparse';
import type { Deck, Card } from '../types/models';

export function toJSON(decks: Deck[], cards: Card[]): string {
  return JSON.stringify({ version: 1, exportedAt: Date.now(), decks, cards }, null, 2);
}

export function toCSV(cards: Card[]): string {
  const rows = cards.map((c) => ({ front: c.front, back: c.back, tags: c.tags.join(',') }));
  return Papa.unparse({ fields: ['front', 'back', 'tags'], data: rows });
}

export function exportDecks(
  allDecks: Deck[],
  allCards: Card[],
  deckIds: string[],
  format: 'json' | 'csv',
): string {
  const idSet = new Set(deckIds);
  const decks = allDecks.filter((d) => idSet.has(d.id));
  const cards = allCards.filter((c) => idSet.has(c.deckId));
  return format === 'json' ? toJSON(decks, cards) : toCSV(cards);
}
