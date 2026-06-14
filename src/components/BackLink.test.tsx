import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BackLink } from './BackLink';

describe('BackLink', () => {
  it('renders with custom label', () => {
    render(<MemoryRouter><BackLink to="/" label="Home" /></MemoryRouter>);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders with default label when omitted', () => {
    render(<MemoryRouter><BackLink to="/" /></MemoryRouter>);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });
});
