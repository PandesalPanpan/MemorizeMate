import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsScreen } from './SettingsScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';
import { DEFAULT_SETTINGS } from '../types/models';

describe('SettingsScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('settings-' + Math.random()), settings: DEFAULT_SETTINGS });
  });

  it('toggles dark theme and persists it to the store', async () => {
    render(<SettingsScreen />);
    await userEvent.selectOptions(screen.getByLabelText(/theme/i), 'dark');
    expect(store.getState().settings.theme).toBe('dark');
  });
});
