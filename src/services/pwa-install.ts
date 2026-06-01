// Manages the beforeinstallprompt PWA event and visit-based nudging.

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;

export function initPwaInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
  });
}

export function canInstall(): boolean {
  return deferred !== null && !installed;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  try {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') {
      deferred = null;
      installed = true;
      return true;
    }
  } catch {
    // user dismissed
  }
  return false;
}

// Visit tracking for the install toast — show after 2+ distinct days
const VISIT_KEY = 'mm_visit_dates';

function recordVisit() {
  const raw = localStorage.getItem(VISIT_KEY) || '';
  const dates = raw ? raw.split(',').filter(Boolean) : [];
  const today = new Date().toISOString().slice(0, 10);
  if (!dates.includes(today)) {
    dates.push(today);
  }
  // keep last 14
  const trimmed = dates.slice(-14);
  localStorage.setItem(VISIT_KEY, trimmed.join(','));
}

export function shouldNudgeInstall(): boolean {
  if (!canInstall()) return false;
  recordVisit();
  const raw = localStorage.getItem(VISIT_KEY) || '';
  const dates = raw.split(',').filter(Boolean);
  if (dates.length < 2) return false;
  const lastNudge = localStorage.getItem('mm_install_nudge_dismissed');
  if (lastNudge) {
    const dismissedAt = Number(lastNudge);
    // re-nudge after 7 days
    if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return false;
  }
  return true;
}

export function dismissNudge() {
  localStorage.setItem('mm_install_nudge_dismissed', String(Date.now()));
}

// Re-export for type safety
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
