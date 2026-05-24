import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('calls onConfirm when confirmed and onCancel when cancelled', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="Delete deck?" message="Removes all cards." confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
