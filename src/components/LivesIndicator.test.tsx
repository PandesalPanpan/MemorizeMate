import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LivesIndicator } from './LivesIndicator';

describe('LivesIndicator', () => {
  it('shows the current life count', () => {
    render(<LivesIndicator current={7} />);
    expect(screen.getByLabelText(/7 of 10 lives/i)).toBeInTheDocument();
  });
});
