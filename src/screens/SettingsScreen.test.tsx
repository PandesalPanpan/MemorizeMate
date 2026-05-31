import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsScreen } from './SettingsScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';
import { DEFAULT_SETTINGS } from '../types/models';

describe('SettingsScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('settings-' + Math.random()), settings: DEFAULT_SETTINGS });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('toggles dark theme and persists it to the store', async () => {
    render(<SettingsScreen />);
    const select = screen.getByLabelText(/theme/i) as HTMLSelectElement;
    await userEvent.selectOptions(select, 'dark');
    await waitFor(() => {
      expect(store.getState().settings.theme).toBe('dark');
    });
  });

  it('toggles Reduce motion when its switch is clicked', async () => {
    render(<SettingsScreen />);
    expect(store.getState().settings.reduceMotion).toBe(false);
    const checkbox = screen.getByRole('checkbox', { name: /reduce motion/i });
    await userEvent.click(checkbox);
    await waitFor(() => {
      expect(store.getState().settings.reduceMotion).toBe(true);
    });
  });

  it('toggles Sound cues when its switch is clicked', async () => {
    render(<SettingsScreen />);
    const initial = store.getState().settings.soundEnabled;
    const checkbox = screen.getByRole('checkbox', { name: /sound cues/i });
    await userEvent.click(checkbox);
    await waitFor(() => {
      expect(store.getState().settings.soundEnabled).toBe(!initial);
    });
  });

  it('toggles Daily review reminder when its switch is clicked', async () => {
    // Notifications API is not present in jsdom; the toggle handler awaits
    // requestPermission() only when turning ON. Starting from OFF means it
    // will be called — stub it on globalThis.
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: async () => 'granted' as NotificationPermission,
    });
    render(<SettingsScreen />);
    const checkbox = screen.getByRole('checkbox', { name: /daily review reminder/i });
    await userEvent.click(checkbox);
    await waitFor(() => {
      expect(store.getState().settings.notifications.enabled).toBe(true);
    });
  });
});
