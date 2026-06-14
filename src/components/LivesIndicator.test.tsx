import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LivesIndicator } from './LivesIndicator';

describe('LivesIndicator', () => {
  it('shows the current life count', () => {
    render(<LivesIndicator current={7} />);
    expect(screen.getByLabelText(/7 lives remaining/i)).toBeInTheDocument();
  });

  it('shows countdown when below max lives with lives prop', () => {
    render(<LivesIndicator current={2} lives={{ current: 2, lastEventAt: Date.now() - 60000 }} />);
    expect(screen.getByLabelText(/2 lives remaining/i)).toBeInTheDocument();
  });
});
