import { describe, it, expect } from 'vitest';
import { parseCloze, renderCloze, clozeIndices, wrapSelection, nextClozeIndex, splitClozeNote, clozeSegments } from './parser';

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
    const result = wrapSelection(text, 30, 41, 1);
    expect(result).toBe('Photosynthesis happens in the {{c1::chloroplast}}');
  });

  it('nextClozeIndex returns 1 for empty text and next index for existing', () => {
    expect(nextClozeIndex('no clozes')).toBe(1);
    expect(nextClozeIndex('{{c1::a}} and {{c3::b}}')).toBe(4);
  });

  describe('splitClozeNote', () => {
    it('returns the note unchanged when it has zero or one deletion', () => {
      expect(splitClozeNote('no clozes')).toEqual(['no clozes']);
      expect(splitClozeNote('only {{c1::one}}')).toEqual(['only {{c1::one}}']);
    });

    it('splits a multi-deletion note into one note per deletion, renumbered to c1', () => {
      const parts = splitClozeNote('The {{c1::sun}} orbits the {{c2::galaxy}}.');
      expect(parts).toEqual([
        'The {{c1::sun}} orbits the galaxy.',
        'The sun orbits the {{c1::galaxy}}.',
      ]);
    });

    it('preserves hints on the active deletion', () => {
      const parts = splitClozeNote('{{c1::Paris::city}} and {{c2::Rome}}');
      expect(parts).toEqual([
        '{{c1::Paris::city}} and Rome',
        'Paris and {{c1::Rome}}',
      ]);
    });
  });

  describe('clozeSegments', () => {
    it('returns null when there is no deletion', () => {
      expect(clozeSegments('plain text')).toBeNull();
    });

    it('parses surrounding text, answer, and hint of the first deletion', () => {
      expect(clozeSegments('The {{c1::sun}} shines.')).toEqual({
        pre: 'The ', answer: 'sun', hint: undefined, post: ' shines.',
      });
      expect(clozeSegments('Capital is {{c1::Paris::city}}')).toEqual({
        pre: 'Capital is ', answer: 'Paris', hint: 'city', post: '',
      });
    });

    it('flattens other deletions in surrounding text to plain answers', () => {
      expect(clozeSegments('The sun orbits the {{c1::galaxy}} not the {{c2::moon}}.')).toEqual({
        pre: 'The sun orbits the ', answer: 'galaxy', hint: undefined, post: ' not the moon.',
      });
    });
  });
});
