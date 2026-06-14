import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
});

describe('pwa-install', () => {
  async function freshImport() {
    return await import('./pwa-install');
  }

  describe('canInstall', () => {
    it('returns false when no deferred prompt exists', async () => {
      const { canInstall } = await freshImport();
      expect(canInstall()).toBe(false);
    });

    it('returns true when deferred prompt exists and not installed', async () => {
      const { canInstall, initPwaInstall } = await freshImport();
      initPwaInstall();
      window.dispatchEvent(new Event('beforeinstallprompt'));
      expect(canInstall()).toBe(true);
    });

    it('returns false after app is installed', async () => {
      const { canInstall, initPwaInstall } = await freshImport();
      initPwaInstall();
      window.dispatchEvent(new Event('beforeinstallprompt'));
      window.dispatchEvent(new Event('appinstalled'));
      expect(canInstall()).toBe(false);
    });
  });

  describe('promptInstall', () => {
    it('returns false when no deferred prompt', async () => {
      const { promptInstall } = await freshImport();
      const result = await promptInstall();
      expect(result).toBe(false);
    });

    it('returns true when user accepts install prompt', async () => {
      const { promptInstall, initPwaInstall, canInstall } = await freshImport();
      initPwaInstall();
      const promptSpy = vi.fn().mockResolvedValue(undefined);
      const fakeEvent = {
        preventDefault: vi.fn(),
        prompt: promptSpy,
        userChoice: Promise.resolve({ outcome: 'accepted' as const }),
      };
      window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), fakeEvent));
      expect(canInstall()).toBe(true);

      const result = await promptInstall();
      expect(result).toBe(true);
      expect(promptSpy).toHaveBeenCalled();
      expect(canInstall()).toBe(false);
    });

    it('returns false when user dismisses install prompt', async () => {
      const { promptInstall, initPwaInstall, canInstall } = await freshImport();
      initPwaInstall();
      const promptSpy = vi.fn().mockResolvedValue(undefined);
      const fakeEvent = {
        preventDefault: vi.fn(),
        prompt: promptSpy,
        userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
      };
      window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), fakeEvent));
      expect(canInstall()).toBe(true);

      const result = await promptInstall();
      expect(result).toBe(false);
      expect(canInstall()).toBe(true);
    });

    it('returns false when prompt throws', async () => {
      const { promptInstall, initPwaInstall } = await freshImport();
      initPwaInstall();
      const fakeEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockRejectedValue(new Error('fail')),
        userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
      };
      window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), fakeEvent));

      const result = await promptInstall();
      expect(result).toBe(false);
    });
  });

  describe('shouldNudgeInstall', () => {
    it('returns false when cannot install', async () => {
      const { shouldNudgeInstall } = await freshImport();
      expect(shouldNudgeInstall()).toBe(false);
    });

    it('returns true with 2+ visits and no recent dismissal', async () => {
      const { shouldNudgeInstall, initPwaInstall } = await freshImport();
      initPwaInstall();
      window.dispatchEvent(new Event('beforeinstallprompt'));
      localStorage.setItem('mm_visit_dates', '2026-01-01,2026-02-01');
      expect(shouldNudgeInstall()).toBe(true);
    });

    it('returns false when dismissed recently', async () => {
      const { shouldNudgeInstall, initPwaInstall, dismissNudge } = await freshImport();
      initPwaInstall();
      window.dispatchEvent(new Event('beforeinstallprompt'));
      dismissNudge();
      expect(shouldNudgeInstall()).toBe(false);
    });

    it('returns false with fewer than 2 visits', async () => {
      const { shouldNudgeInstall, initPwaInstall } = await freshImport();
      initPwaInstall();
      window.dispatchEvent(new Event('beforeinstallprompt'));
      localStorage.setItem('mm_visit_dates', new Date().toISOString().slice(0, 10));
      expect(shouldNudgeInstall()).toBe(false);
    });

    it('returns true when dismissal is older than 7 days (re-nudge)', async () => {
      const { shouldNudgeInstall, initPwaInstall } = await freshImport();
      initPwaInstall();
      window.dispatchEvent(new Event('beforeinstallprompt'));
      localStorage.setItem('mm_visit_dates', '2026-01-01,2026-02-01');
      localStorage.setItem('mm_install_nudge_dismissed', String(Date.now() - 8 * 24 * 60 * 60 * 1000));
      expect(shouldNudgeInstall()).toBe(true);
    });
  });

  describe('dismissNudge', () => {
    it('stores dismissal timestamp', async () => {
      const { dismissNudge } = await freshImport();
      dismissNudge();
      expect(localStorage.getItem('mm_install_nudge_dismissed')).toBeTruthy();
    });
  });

  describe('initPwaInstall', () => {
    it('registers event listeners without crashing', async () => {
      const { initPwaInstall } = await freshImport();
      expect(() => initPwaInstall()).not.toThrow();
    });
  });
});
