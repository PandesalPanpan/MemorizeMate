import { describe, it, expect } from 'vitest';
import { earliestAvailableAt, allGraduated, createSessionEntry } from './sessionQueue';

describe('sessionQueue — phase 2', () => {
  const NOW = 1000000;

  it('earliestAvailableAt returns the minimum availableAt among non-graduated entries', () => {
    const entries = [
      { cardId: 'a', step: 0, availableAt: NOW + 5000, graduated: false },
      { cardId: 'b', step: 1, availableAt: NOW + 1000, graduated: false },
      { cardId: 'c', step: 3, availableAt: NOW, graduated: true },
    ];
    expect(earliestAvailableAt(entries)).toBe(NOW + 1000);
  });

  it('earliestAvailableAt returns null when all entries are graduated', () => {
    const entries = [
      { cardId: 'a', step: 3, availableAt: 0, graduated: true },
    ];
    expect(earliestAvailableAt(entries)).toBeNull();
  });

  it('earliestAvailableAt returns null for empty array', () => {
    expect(earliestAvailableAt([])).toBeNull();
  });

  it('allGraduated returns true when all entries are graduated', () => {
    const entries = [
      { cardId: 'a', step: 3, availableAt: NOW, graduated: true },
      { cardId: 'b', step: 4, availableAt: NOW, graduated: true },
    ];
    expect(allGraduated(entries)).toBe(true);
  });

  it('allGraduated returns false when any entry is not graduated', () => {
    const entries = [
      { cardId: 'a', step: 3, availableAt: NOW, graduated: true },
      { cardId: 'b', step: 1, availableAt: NOW + 1000, graduated: false },
    ];
    expect(allGraduated(entries)).toBe(false);
  });
});
