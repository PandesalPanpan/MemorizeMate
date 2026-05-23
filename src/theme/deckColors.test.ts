import { describe, it, expect } from 'vitest';
import { deckColorVars, deckColorValue } from './deckColors';

describe('deck colors', () => {
  it('maps every palette color to a hex for a mode', () => {
    expect(deckColorValue('terracotta', 'light')).toMatch(/^#/);
    expect(deckColorValue('sage', 'dark')).toMatch(/^#/);
  });
  it('emits CSS vars for all palette colors', () => {
    const vars = deckColorVars('light');
    expect(vars['--deck-terracotta']).toMatch(/^#/);
    expect(Object.keys(vars).length).toBeGreaterThanOrEqual(6);
  });
});
