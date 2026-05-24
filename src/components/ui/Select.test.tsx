import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

describe('Select', () => {
  it('renders an accessible labelled select and reports changes', async () => {
    const onChange = vi.fn();
    render(
      <Select id="x" label="Pick" value="a" onChange={onChange}
        options={[{ value: 'a', label: 'Apple' }, { value: 'b', label: 'Banana' }]} />,
    );
    await userEvent.selectOptions(screen.getByLabelText(/pick/i), 'b');
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
