import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClozeEditor } from './ClozeEditor';

describe('ClozeEditor', () => {
  it('wraps the selected text as the next cloze on button click', async () => {
    const onChange = vi.fn();
    render(<ClozeEditor value="The chloroplast" onChange={onChange} />);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    ta.setSelectionRange(4, 15); // "chloroplast"
    await userEvent.click(screen.getByRole('button', { name: /make cloze/i }));
    expect(onChange).toHaveBeenCalledWith('The {{c1::chloroplast}}');
  });
});
