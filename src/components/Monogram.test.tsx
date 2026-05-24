import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Monogram } from './Monogram';

describe('Monogram', () => {
  it('renders deck initials', () => {
    render(<Monogram name="Biology Basics" color="sage" />);
    expect(screen.getByText('BB')).toBeInTheDocument();
  });
});
