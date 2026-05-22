import { useStore, store } from '../store/useStore';
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
          <label className={styles.rowLabel} htmlFor="theme">Theme</label>
          <select id="theme" className={styles.select} value={settings.theme} onChange={(e) => set({ theme: e.target.value as 'light' | 'dark' | 'auto' })}>
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
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
