import { describe, it, expect } from 'vitest';
import { DECK_COLORS, isDeckColor, DEFAULT_SETTINGS, INITIAL_LIVES } from './models';

describe('phase 2 models', () => {
  it('exposes a curated deck-color palette', () => {
    expect(DECK_COLORS.length).toBeGreaterThanOrEqual(6);
    expect(DECK_COLORS).toContain('terracotta');
  });
  it('guards deck-color values', () => {
    expect(isDeckColor('terracotta')).toBe(true);
    expect(isDeckColor('neon')).toBe(false);
  });
  it('defaults sidebar expanded and lives at 10', () => {
    expect(DEFAULT_SETTINGS.sidebarCollapsed).toBe(false);
    expect(INITIAL_LIVES).toBe(10);
  });
});
