import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClozeEditor } from './ClozeEditor';

describe('ClozeEditor — phase 2', () => {
  it('shows cloze count preview when value has clozes', () => {
    const onChange = vi.fn();
    render(<ClozeEditor value="The {{c1::chloroplast}} is green" onChange={onChange} />);
    expect(screen.getByText(/1 cloze deletion/)).toBeInTheDocument();
  });

  it('does not wrap when no text is selected', async () => {
    const onChange = vi.fn();
    render(<ClozeEditor value="Hello world" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /make cloze/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
