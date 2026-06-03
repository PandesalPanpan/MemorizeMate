import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsScreen } from './SettingsScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';
import { DEFAULT_SETTINGS } from '../types/models';

describe('SettingsScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('settings-' + Math.random()), settings: { ...DEFAULT_SETTINGS } });
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

  it('shows AM/PM time selectors when notifications are enabled', async () => {
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: async () => 'granted' as NotificationPermission,
    });
    store.setState({
      settings: {
        ...store.getState().settings,
        notifications: { enabled: true, reminderMinutes: 540 },
      },
    });
    render(<SettingsScreen />);

    expect(screen.getByLabelText('Hour')).toBeInTheDocument();
    expect(screen.getByLabelText('Minute')).toBeInTheDocument();
    expect(screen.getByLabelText('AM/PM')).toBeInTheDocument();
  });

  it('changes reminder time and persists to store', async () => {
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: async () => 'granted' as NotificationPermission,
    });
    store.setState({
      settings: {
        ...store.getState().settings,
        notifications: { enabled: true, reminderMinutes: 540 },
      },
    });
    render(<SettingsScreen />);

    await userEvent.selectOptions(screen.getByLabelText('Hour'), '2');
    await userEvent.selectOptions(screen.getByLabelText('Minute'), '30');
    await userEvent.selectOptions(screen.getByLabelText('AM/PM'), 'PM');

    await waitFor(() => {
      expect(store.getState().settings.notifications.reminderMinutes).toBe(14 * 60 + 30);
    });
  });
});
