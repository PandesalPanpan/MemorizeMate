import { useEffect, useState } from 'react';
import { useStore, store } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { requestPermission } from '../services/notifications';
import { canInstall, promptInstall } from '../services/pwa-install';
import type { Deck } from '../types/models';
import styles from './SettingsScreen.module.css';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className={styles.switch}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className={styles.track} aria-hidden />
    </span>
  );
}

function minutesToParts(minutes: number): { h12: number; min: number; am: boolean } {
  const h24 = Math.floor(minutes / 60);
  const min = minutes % 60;
  const am = h24 < 12;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return { h12, min, am };
}

function partsToMinutes(h12: number, min: number, am: boolean): number {
  let h24 = am ? h12 : h12 + 12;
  if (h12 === 12) h24 = am ? 0 : 12;
  return h24 * 60 + min;
}

export function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const set = store.getState().updateSettings;
  return (
    <section>
      <h2>Settings</h2>

      <div className={styles.group}>
        <div className={styles.groupTitle}>Appearance</div>
        <div className={styles.row}>
          <Select
            id="theme"
            label="Theme"
            value={settings.theme}
            onChange={(v) => set({ theme: v as 'light' | 'dark' | 'auto' })}
            options={[{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Reduce motion</span>
          <Toggle label="Reduce motion" checked={settings.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.groupTitle}>Gamification</div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>XP, levels &amp; celebrations</span>
          <Toggle
            label="Gamification"
            checked={settings.gamificationEnabled}
            onChange={(v) => set({ gamificationEnabled: v })}
          />
        </div>
        <div className={styles.row}>
          <Select
            id="sessionSize"
            label="Cards per session"
            value={String(settings.sessionSize)}
            onChange={(v) => set({ sessionSize: Number(v) })}
            options={[
              { value: '10', label: '10' },
              { value: '15', label: '15' },
              { value: '20', label: '20' },
              { value: '25', label: '25' },
              { value: '30', label: '30' },
            ]}
          />
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.groupTitle}>Study</div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Sound cues</span>
          <Toggle label="Sound cues" checked={settings.soundEnabled} onChange={(v) => set({ soundEnabled: v })} />
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Daily review reminder</span>
          <Toggle
            label="Daily review reminder"
            checked={settings.notifications.enabled} onChange={async (v) => {
            if (v) await requestPermission();
            set({ notifications: { ...settings.notifications, enabled: v } });
          }} />
        </div>
        {settings.notifications.enabled && <ReminderTimeRow />}
      </div>
      <div className={styles.group}>
        <div className={styles.groupTitle}>App</div>
        <InstallAppRow />
        <div className={styles.row}>
          <span className={styles.rowLabel}>Version</span>
          <span className={styles.rowValue}>{__APP_VERSION__}</span>
        </div>
      </div>
      <FsrsOptimizationSection />
      <div className={styles.group}>
        <div className={styles.groupTitle}>Archived decks</div>
        <ArchivedDecks />
      </div>
    </section>
  );
}

function ReminderTimeRow() {
  const settings = useStore((s) => s.settings.notifications);
  const set = store.getState().updateSettings;

  const { h12, min, am } = minutesToParts(settings.reminderMinutes);

  function update(h12Val: number, minVal: number, amVal: boolean) {
    const m = partsToMinutes(h12Val, minVal, amVal);
    set({ notifications: { ...settings, reminderMinutes: m } });
  }

  const hourOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
  const minOptions = Array.from({ length: 12 }, (_, i) => {
    const v = i * 5;
    return { value: String(v), label: String(v).padStart(2, '0') };
  });

  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>Reminder time</span>
      <div className={styles.timeFields}>
        <Select
          id="reminderHour"
          label="Hour"
          value={String(h12)}
          onChange={(v) => update(Number(v), min, am)}
          options={hourOptions}
        />
        <Select
          id="reminderMinute"
          label="Minute"
          value={String(min)}
          onChange={(v) => update(h12, Number(v), am)}
          options={minOptions}
        />
        <Select
          id="reminderAmPm"
          label="AM/PM"
          value={am ? 'AM' : 'PM'}
          onChange={(v) => update(h12, min, v === 'AM')}
          options={[{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }]}
        />
      </div>
    </div>
  );
}

function InstallAppRow() {
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(canInstall()); }, []);
  if (!ok) return null;
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>Install app</span>
      <Button variant="outline" size="sm" onClick={async () => { await promptInstall(); setOk(canInstall()); }}>
        Install
      </Button>
    </div>
  );
}

function ArchivedDecks() {
  const [archived, setArchived] = useState<Deck[]>([]);
  useEffect(() => {
    store.getState().repo.listDecks().then((all) => {
      setArchived(all.filter((d) => d.archived));
    });
  }, []);
  if (archived.length === 0) return <p className={styles.rowLabel}>No archived decks.</p>;
  return (
    <div>
      {archived.map((d) => (
        <div key={d.id} className={styles.row}>
          <span className={styles.rowLabel}>{d.name}</span>
          <Button variant="ghost" size="sm" onClick={async () => {
            await store.getState().unarchiveDeck(d.id);
            setArchived((prev) => prev.filter((x) => x.id !== d.id));
          }}>Unarchive</Button>
        </div>
      ))}
    </div>
  );
}

function FsrsOptimizationSection() {
  const settings = useStore((s) => s.settings);
  const optimizing = useStore((s) => s.fsrsOptimizing);
  const progress = useStore((s) => s.fsrsOptimizeProgress);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleOptimize = async () => {
    setLocalError(null);
    try {
      await store.getState().optimizeFsrsParams();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Optimization failed');
    }
  };

  const handleReset = async () => {
    await store.getState().resetFsrsParams();
  };

  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>FSRS Personalization</div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Parameters</span>
        <span className={styles.rowValue}>
          {settings.fsrsParams ? 'Personalized' : 'Default'}
        </span>
      </div>

      {settings.fsrsParamsAccuracy != null && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>Prediction accuracy</span>
          <span className={styles.rowValue}>
            {settings.fsrsParamsDefaultAccuracy != null && (
              <span className={styles.accuracyCompare}>
                <span className={styles.accuracyOld}>
                  {(settings.fsrsParamsDefaultAccuracy * 100).toFixed(1)}%
                </span>
                {' → '}
              </span>
            )}
            <span className={styles.accuracyNew}>
              {(settings.fsrsParamsAccuracy * 100).toFixed(1)}%
            </span>
          </span>
        </div>
      )}

      <div className={styles.row}>
        <span className={styles.rowLabel}>
          {optimizing
            ? `Optimizing... ${Math.round(progress * 100)}%`
            : 'Recalibrate using your review history'}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={optimizing}
          onClick={handleOptimize}
        >
          {optimizing ? 'Running...' : 'Optimize'}
        </Button>
      </div>

      {settings.fsrsParams && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>Reset to default parameters</span>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>
      )}

      {localError && <p className={styles.optimizeError}>{localError}</p>}
    </div>
  );
}
