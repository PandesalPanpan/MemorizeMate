import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateToast } from './UpdateToast';

const { mockNeedRefresh, mockUpdateServiceWorker } = vi.hoisted(() => ({
  mockNeedRefresh: { current: false },
  mockUpdateServiceWorker: vi.fn(),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [mockNeedRefresh.current],
    updateServiceWorker: mockUpdateServiceWorker,
  }),
}));

describe('UpdateToast', () => {
  beforeEach(() => {
    mockNeedRefresh.current = false;
    mockUpdateServiceWorker.mockClear();
  });

  it('renders nothing when needRefresh is false', () => {
    const { container } = render(<UpdateToast />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the toast when needRefresh is true', () => {
    mockNeedRefresh.current = true;
    render(<UpdateToast />);
    expect(screen.getByRole('alert')).toHaveTextContent('A new version is available');
  });

  it('calls updateServiceWorker on button click', () => {
    mockNeedRefresh.current = true;
    render(<UpdateToast />);
    fireEvent.click(screen.getByRole('button', { name: /update/i }));
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });
});
