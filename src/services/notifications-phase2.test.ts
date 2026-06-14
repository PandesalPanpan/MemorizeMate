import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window, 'setTimeout');
  (globalThis as any).Notification = {
    permission: 'granted',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Re-import after mocks are set up
let scheduleReminder: typeof import('./notifications').scheduleReminder;
let setBadge: typeof import('./notifications').setBadge;

beforeAll(async () => {
  const mod = await import('./notifications');
  scheduleReminder = mod.scheduleReminder;
  setBadge = mod.setBadge;
});

describe('notifications — scheduleReminder & setBadge', () => {
  it('schedules a timer with the correct delay and fires notification', async () => {
    const mod = await import('./notifications');
    const localScheduleReminder = mod.scheduleReminder;
    const mockNotification = vi.fn();
    (globalThis as any).Notification = mockNotification;
    mockNotification.permission = 'granted';

    const now = new Date('2026-06-07T08:00:00');
    vi.setSystemTime(now);

    localScheduleReminder(9 * 60, 'Time to study!');
    expect(window.setTimeout).toHaveBeenCalledWith(expect.any(Function), 60 * 60 * 1000);

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(mockNotification).toHaveBeenCalledWith('MemorizeMate', { body: 'Time to study!' });
  });

  it('does not fire notification when permission is not granted', async () => {
    const mod = await import('./notifications');
    const localScheduleReminder = mod.scheduleReminder;
    (globalThis as any).Notification = { permission: 'denied' };

    const now = new Date('2026-06-07T08:00:00');
    vi.setSystemTime(now);

    localScheduleReminder(9 * 60, 'Time to study!');
    vi.advanceTimersByTime(60 * 60 * 1000);
  });

  it('setBadge clears badge when count is 0', async () => {
    const mod = await import('./notifications');
    const localSetBadge = mod.setBadge;
    const clearSpy = vi.fn().mockResolvedValue(undefined);
    (navigator as any).clearAppBadge = clearSpy;
    expect(() => localSetBadge(0)).not.toThrow();
    expect(clearSpy).toHaveBeenCalled();
  });
});
