import { describe, it, expect } from 'vitest';
import { parseImport } from './parser';

describe('parseImport', () => {
  it('detects cloze blocks (one block per non-empty line containing {{cN::}})', () => {
    const r = parseImport('The {{c1::mitochondria}} is the powerhouse.');
    expect(r.format).toBe('cloze');
    expect(r.cards).toHaveLength(1);
    expect(r.cards[0]).toMatchObject({ type: 'cloze', front: 'The {{c1::mitochondria}} is the powerhouse.' });
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
});
