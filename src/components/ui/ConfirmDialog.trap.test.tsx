import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog focus trap', () => {
  it('traps tab focus between cancel and confirm', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="Delete deck?" message="Removes all cards." confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} />);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    const confirmBtn = screen.getByRole('button', { name: /delete/i });

    // initial focus on cancel
    expect(document.activeElement).toBe(cancelBtn);

    // Set focus to confirm and tab forward -> traps to cancel
    confirmBtn.focus();
    expect(document.activeElement).toBe(confirmBtn);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(cancelBtn);

    // Set focus to cancel and shift-tab -> traps to confirm
    cancelBtn.focus();
    expect(document.activeElement).toBe(cancelBtn);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirmBtn);

    // Non-tab key doesn't interfere
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders without message element when message is not provided', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="Just title" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('heading', { name: /just title/i })).toBeDefined();
  });
});
