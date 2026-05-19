import Papa from 'papaparse';

export type ImportFormat = 'cloze' | 'pipe' | 'csv' | 'unknown';

export interface ParsedCard {
  type: 'basic' | 'cloze';
  front: string;
  back: string;
  tags: string[];
}

export interface ImportResult {
  format: ImportFormat;
  cards: ParsedCard[];
}

const CLOZE_RE = /\{\{c\d+::.*?\}\}/;

export function parseImport(raw: string): ImportResult {
  const text = raw.trim();
  if (!text) return { format: 'unknown', cards: [] };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Cloze: any line contains cloze markup
  if (lines.some((l) => CLOZE_RE.test(l))) {
    return {
      format: 'cloze',
      cards: lines
        .filter((l) => CLOZE_RE.test(l))
        .map((l) => ({ type: 'cloze', front: l, back: '', tags: [] })),
    };
  }

  // 2. Pipe-delimited
  if (lines.every((l) => l.includes('|'))) {
    return {
      format: 'pipe',
      cards: lines.map((l) => {
        const [front, ...rest] = l.split('|');
        return { type: 'basic', front: front.trim(), back: rest.join('|').trim(), tags: [] };
      }),
    };
  }

  // 3. CSV (front,back[,tags])
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.data.length && parsed.meta.fields?.includes('front') && parsed.meta.fields?.includes('back')) {
    return {
      format: 'csv',
      cards: parsed.data.map((row) => ({
        type: 'basic',
        front: (row.front ?? '').trim(),
        back: (row.back ?? '').trim(),
        tags: (row.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
      })),
    };
  }

  return { format: 'unknown', cards: [] };
}
