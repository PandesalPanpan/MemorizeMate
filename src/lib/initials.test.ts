import { describe, it, expect } from 'vitest';
import { initials } from './initials';

describe('initials', () => {
  it('takes first letters of the first two words', () => {
    expect(initials('Biology Basics')).toBe('BB');
  });
  it('uses two letters of a single word', () => {
    expect(initials('Spanish')).toBe('SP');
  });
  it('handles empty/whitespace', () => {
    expect(initials('   ')).toBe('?');
  });
});
