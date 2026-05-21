import { useStore, store } from '../store/useStore';

export function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const set = store.getState().updateSettings;
  return (
    <section>
      <h2>Settings</h2>

      <label htmlFor="theme">Theme</label>
      <select id="theme" value={settings.theme} onChange={(e) => set({ theme: e.target.value as any })}>
        <option value="auto">Auto</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>

      <label style={{ display: 'block', marginTop: 12 }}>
        <input type="checkbox" checked={settings.soundEnabled} onChange={(e) => set({ soundEnabled: e.target.checked })} />
        Sound cues
      </label>

      <label style={{ display: 'block', marginTop: 12 }}>
        <input type="checkbox" checked={settings.reduceMotion} onChange={(e) => set({ reduceMotion: e.target.checked })} />
        Reduce motion
      </label>

      <label style={{ display: 'block', marginTop: 12 }}>
        <input type="checkbox" checked={settings.notifications.enabled}
          onChange={(e) => set({ notifications: { ...settings.notifications, enabled: e.target.checked } })} />
        Daily review reminder
      </label>
    </section>
  );
}
