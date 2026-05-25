import { useStore, store } from '../store/useStore';
import { Select } from '../components/ui/Select';
import { requestPermission } from '../services/notifications';
import styles from './SettingsScreen.module.css';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span className={styles.switch}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.track} aria-hidden />
    </span>
  );
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
          <Toggle checked={settings.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.groupTitle}>Study</div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Sound cues</span>
          <Toggle checked={settings.soundEnabled} onChange={(v) => set({ soundEnabled: v })} />
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Daily review reminder</span>
          <Toggle checked={settings.notifications.enabled} onChange={async (v) => {
            if (v) await requestPermission();
            set({ notifications: { ...settings.notifications, enabled: v } });
          }} />
        </div>
        {settings.notifications.enabled && (
          <div className={styles.row}>
            <Select
              id="reminderHour"
              label="Reminder time"
              value={String(settings.notifications.reminderHour)}
              onChange={(v) => set({ notifications: { ...settings.notifications, reminderHour: Number(v) } })}
              options={Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, '0')}:00` }))}
            />
          </div>
        )}
      </div>
    </section>
  );
}
