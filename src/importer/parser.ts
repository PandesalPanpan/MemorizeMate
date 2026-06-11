import Papa from 'papaparse';
import type { Deck, Card } from '../types/models';

export type ImportFormat = 'backup' | 'cloze' | 'pipe' | 'csv' | 'unknown';

export interface ParsedCard {
  type: 'basic' | 'cloze';
  front: string;
  back: string;
}

export interface ImportResult {
  format: ImportFormat;
  cards: ParsedCard[];
  backup?: { decks: Deck[]; cards: Card[] };
}

const CLOZE_RE = /\{\{c\d+::.*?\}\}/;

export function parseImport(raw: string): ImportResult {
  const text = raw.trim();
  if (!text) return { format: 'unknown', cards: [] };

  // 0. Full JSON backup ({ decks, cards }) — restore-with-merge path.
  if (text.startsWith('{')) {
    try {
      const obj = JSON.parse(text);
      if (obj && Array.isArray(obj.decks) && Array.isArray(obj.cards)) {
        return { format: 'backup', cards: [], backup: { decks: obj.decks as Deck[], cards: obj.cards as Card[] } };
      }
    } catch { /* not JSON — fall through to text formats */ }
  }

  const lines = text.split(/\r?\n/).flatMap((l) => { const t = l.trim(); return t ? [t] : []; });

  // 1. Cloze: any line contains cloze markup
  if (lines.some((l) => CLOZE_RE.test(l))) {
    return {
      format: 'cloze',
      cards: lines
        .filter((l) => CLOZE_RE.test(l))
        .map((l) => ({ type: 'cloze', front: l, back: '' })),
    };
  }

  // 2. Pipe-delimited
  if (lines.every((l) => l.includes('|'))) {
    return {
      format: 'pipe',
      cards: lines.map((l) => {
        const [front, ...rest] = l.split('|');
        return { type: 'basic', front: front.trim(), back: rest.join('|').trim() };
      }),
    };
  }

  // 3. CSV (front,back)
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.data.length && parsed.meta.fields?.includes('front') && parsed.meta.fields?.includes('back')) {
    return {
      format: 'csv',
      cards: parsed.data.map((row) => ({
        type: 'basic',
        front: (row.front ?? '').trim(),
        back: (row.back ?? '').trim(),
      })),
    };
  }

  return { format: 'unknown', cards: [] };
}
