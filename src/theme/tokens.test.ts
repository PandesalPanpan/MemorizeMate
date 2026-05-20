import { describe, it, expect } from 'vitest';
import { tokens, cssVars } from './tokens';

describe('design tokens', () => {
  it('defines the Ink & Paper core palette', () => {
    expect(tokens.color.paper).toBe('#F7F3EC');
    expect(tokens.color.ink).toBe('#1A1714');
    expect(tokens.color.accent).toBe('#C75B39');
  });
  it('emits CSS custom properties for a theme mode', () => {
    const vars = cssVars('light');
    expect(vars['--color-bg']).toBe('#F7F3EC');
    expect(vars['--color-text']).toBe('#1A1714');
    const dark = cssVars('dark');
    expect(dark['--color-bg']).not.toBe(vars['--color-bg']);
  });
});
