import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestPermission, setBadge, nextReminderDelayMs } from './notifications';

describe('notifications service', () => {
  beforeEach(() => {
    (globalThis as any).Notification = { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') };
  });

  it('requests permission and returns the result', async () => {
    expect(await requestPermission()).toBe('granted');
  });

  it('computes the delay to the next reminder hour', () => {
    const now = new Date('2026-05-30T08:00:00');
    expect(nextReminderDelayMs(9, now)).toBe(60 * 60 * 1000); // 1 hour to 09:00
    const afterHour = new Date('2026-05-30T10:00:00');
    expect(nextReminderDelayMs(9, afterHour)).toBe(23 * 60 * 60 * 1000); // next day 09:00
  });

  it('setBadge tolerates missing API', () => {
    expect(() => setBadge(3)).not.toThrow();
  });
});
