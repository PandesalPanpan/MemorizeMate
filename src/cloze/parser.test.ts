import { describe, it, expect } from 'vitest';
import { parseCloze, renderCloze, clozeIndices, wrapSelection } from './parser';

describe('cloze parser', () => {
  it('detects all distinct cloze indices', () => {
    expect(clozeIndices('A {{c1::x}} and {{c2::y}} and {{c1::z}}')).toEqual([1, 2]);
    expect(clozeIndices('no clozes here')).toEqual([]);
  });

  it('renders the question hiding only the active index', () => {
    const text = 'The {{c1::sun}} orbits the {{c2::galaxy}}.';
    const r = renderCloze(text, 1);
    expect(r.question).toBe('The [...] orbits the galaxy.');
    expect(r.answer).toBe('The sun orbits the galaxy.');
  });

  it('shows hint placeholder when provided', () => {
    const r = renderCloze('Capital is {{c1::Paris::city}}', 1);
    expect(r.question).toBe('Capital is [city]');
    expect(r.answer).toBe('Capital is Paris');
  });

  it('parseCloze expands one source into one card per index', () => {
    const cards = parseCloze('{{c1::a}} {{c2::b}}');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toEqual({ index: 1, question: '[...] b', answer: 'a b' });
    expect(cards[1]).toEqual({ index: 2, question: 'a [...]', answer: 'a b' });
  });

  it('wrapSelection wraps text as the next available cloze index', () => {
    const text = 'Photosynthesis happens in the chloroplast';
    const result = wrapSelection(text, 30, 41, 1); // "chloroplast"
    expect(result).toBe('Photosynthesis happens in the {{c1::chloroplast}}');
  });
});
