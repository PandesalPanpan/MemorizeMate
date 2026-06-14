import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestPermission, setBadge, nextReminderDelayMs, scheduleReminder } from './notifications';

describe('notifications service', () => {
  beforeEach(() => {
    (globalThis as any).Notification = { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') };
    (globalThis as any).window = globalThis;
  });

  it('requests permission and returns the result', async () => {
    expect(await requestPermission()).toBe('granted');
  });

  it('returns denied when Notification is undefined', async () => {
    (globalThis as any).Notification = undefined;
    expect(await requestPermission()).toBe('denied');
  });

  it('returns existing permission when not default', async () => {
    (globalThis as any).Notification = { permission: 'granted' };
    expect(await requestPermission()).toBe('granted');
  });

  it('scheduleReminder returns null when window is undefined', () => {
    const realWindow = (globalThis as any).window;
    (globalThis as any).window = undefined;
    expect(scheduleReminder(9 * 60, 'test')).toBeNull();
    (globalThis as any).window = realWindow;
  });

  it('scheduleReminder returns null when Notification is undefined', () => {
    (globalThis as any).Notification = undefined;
    expect(scheduleReminder(9 * 60, 'test')).toBeNull();
  });

  it('computes the delay to the next reminder time (minutes since midnight)', () => {
    const now = new Date('2026-05-30T08:00:00');
    expect(nextReminderDelayMs(9 * 60, now)).toBe(60 * 60 * 1000);
    const afterTime = new Date('2026-05-30T10:00:00');
    expect(nextReminderDelayMs(9 * 60, afterTime)).toBe(23 * 60 * 60 * 1000);
  });

  it('computes delay with minutes precision', () => {
    const now = new Date('2026-05-30T14:22:00');
    const delay = nextReminderDelayMs(14 * 60 + 30, now);
    expect(delay).toBe(8 * 60 * 1000);
  });

  it('setBadge tolerates missing API', () => {
    expect(() => setBadge(3)).not.toThrow();
  });
});
