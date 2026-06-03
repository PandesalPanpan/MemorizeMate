export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/** ms until the next occurrence of `minutesSinceMidnight` local time. */
export function nextReminderDelayMs(minutes: number, now: Date = new Date()): number {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

/** Best-effort: fire a local notification while the app is open at the reminder time. */
export function scheduleReminder(minutes: number, message: string): number | null {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return null;
  const delay = nextReminderDelayMs(minutes);
  return window.setTimeout(() => {
    if (Notification.permission === 'granted') new Notification('MemorizeMate', { body: message });
  }, delay);
}

export function setBadge(count: number): void {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (count > 0) nav.setAppBadge?.(count);
    else nav.clearAppBadge?.();
  } catch { /* badging unsupported */ }
}
