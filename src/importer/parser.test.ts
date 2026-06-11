import { describe, it, expect } from 'vitest';
import { parseImport } from './parser';

describe('parseImport', () => {
  it('detects cloze blocks (one block per non-empty line containing {{cN::}})', () => {
    const r = parseImport('The {{c1::mitochondria}} is the powerhouse.');
    expect(r.format).toBe('cloze');
    expect(r.cards).toHaveLength(1);
    expect(r.cards[0]).toMatchObject({ type: 'cloze', front: 'The {{c1::mitochondria}} is the powerhouse.' });
  });

  it('filters non-cloze lines out of cloze mode', () => {
    const r = parseImport('{{c1::mitochondria}}\nsome plain line');
    expect(r.format).toBe('cloze');
    expect(r.cards).toHaveLength(1);
  });

  it('detects pipe-delimited Front | Back', () => {
    const r = parseImport('Capital of France | Paris\nLargest planet | Jupiter');
    expect(r.format).toBe('pipe');
    expect(r.cards).toHaveLength(2);
    expect(r.cards[1]).toMatchObject({ type: 'basic', front: 'Largest planet', back: 'Jupiter' });
  });

  it('detects CSV with header', () => {
    const r = parseImport('front,back\nDog,Perro');
    expect(r.format).toBe('csv');
    expect(r.cards[0]).toMatchObject({ type: 'basic', front: 'Dog', back: 'Perro' });
  });

  it('reports parse errors for unrecognized empty input', () => {
    const r = parseImport('   ');
    expect(r.cards).toHaveLength(0);
    expect(r.format).toBe('unknown');
  });

  it('handles CSV rows with missing trailing columns', () => {
    const r = parseImport('front,back\nSolo\nDog,Perro');
    expect(r.format).toBe('csv');
    expect(r.cards).toHaveLength(2);
    expect(r.cards[0].front).toBe('Solo');
    expect(r.cards[0].back).toBe('');
    expect(r.cards[1].back).toBe('Perro');
  });

  it('returns unknown for unrecognized non-empty input', () => {
    const r = parseImport('just some random text without any structure');
    expect(r.format).toBe('unknown');
    expect(r.cards).toHaveLength(0);
  });

  it('detects a JSON backup with decks and cards arrays', () => {
    const backup = JSON.stringify({
      version: 1,
      decks: [{ id: 'd1', name: 'Bio' }],
      cards: [{ id: 'c1', deckId: 'd1', front: 'Q', back: 'A' }],
    });
    const r = parseImport(backup);
    expect(r.format).toBe('backup');
    expect(r.backup?.decks).toHaveLength(1);
    expect(r.backup?.cards).toHaveLength(1);
  });

  it('does not treat arbitrary JSON as a backup', () => {
    const r = parseImport('{"hello":"world"}');
    expect(r.format).not.toBe('backup');
  });
});
