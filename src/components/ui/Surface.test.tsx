import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Surface } from './Surface';

describe('Surface', () => {
  it('renders a div with surface CSS class and passes extra props', () => {
    render(<Surface data-testid="surface">Hello</Surface>);
    const el = screen.getByTestId('surface');
    expect(el.tagName).toBe('DIV');
    expect(el.className).toContain('surface');
    expect(el.textContent).toBe('Hello');
  });

  it('merges custom className with surface class', () => {
    render(<Surface className="custom" data-testid="s">x</Surface>);
    const el = screen.getByTestId('s');
    expect(el.className).toContain('surface');
    expect(el.className).toContain('custom');
  });
});
