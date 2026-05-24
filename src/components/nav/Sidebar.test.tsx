import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('toggles collapse via the control', async () => {
    const onToggle = vi.fn();
    render(<MemoryRouter><Sidebar collapsed={false} onToggle={onToggle} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    expect(onToggle).toHaveBeenCalled();
  });
});
