import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../fsrs/optimizer', () => ({
  runOptimization: vi.fn(),
}));

import { createStore } from './useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';
import { runOptimization } from '../fsrs/optimizer';

function fresh() { return createStore(new IndexedDbRepository('fsrs-' + Math.random())); }

describe('store — optimizeFsrsParams & resetFsrsParams', () => {
  let s: ReturnType<typeof fresh>;

  beforeEach(() => {
    s = fresh();
  });

  it('optimizeFsrsParams runs optimization and persists results', async () => {
    vi.mocked(runOptimization).mockReturnValue({
      parameters: [1, 2, 3],
      accuracy: 0.95,
      defaultAccuracy: 0.85,
    });

    await s.getState().optimizeFsrsParams();

    const settings = await s.getState().repo.getSettings();
    expect(settings.fsrsParams).toEqual([1, 2, 3]);
    expect(settings.fsrsParamsAccuracy).toBe(0.95);
    expect(settings.fsrsParamsDefaultAccuracy).toBe(0.85);
    expect(s.getState().fsrsOptimizing).toBe(false);
    expect(s.getState().fsrsOptimizeProgress).toBe(1);
  });

  it('resetFsrsParams clears personalized params', async () => {
    await s.getState().updateSettings({
      fsrsParams: [1, 2, 3],
      fsrsParamsAccuracy: 0.95,
      fsrsParamsDefaultAccuracy: 0.85,
    });

    await s.getState().resetFsrsParams();

    const settings = await s.getState().repo.getSettings();
    expect(settings.fsrsParams).toBeUndefined();
    expect(settings.fsrsParamsAccuracy).toBeUndefined();
    expect(settings.fsrsParamsDefaultAccuracy).toBeUndefined();
  });

  it('optimizeFsrsParams sets error state on failure', async () => {
    vi.mocked(runOptimization).mockImplementation(() => { throw new Error('boom'); });

    await expect(s.getState().optimizeFsrsParams()).rejects.toThrow('boom');
    expect(s.getState().error).toBe('boom');
    expect(s.getState().fsrsOptimizing).toBe(false);
  });
});
