import { useStore, store } from '../store/useStore';
import { Select } from '../components/ui/Select';
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
          <Toggle checked={settings.notifications.enabled} onChange={(v) => set({ notifications: { ...settings.notifications, enabled: v } })} />
        </div>
      </div>
    </section>
  );
}
