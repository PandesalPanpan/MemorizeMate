import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the home route with the app name in nav', async () => {
    render(<App />);
    expect(await screen.findByRole('navigation')).toBeInTheDocument();
    expect(screen.getAllByText((_, el) => el?.textContent === 'MemorizeMate').length).toBeGreaterThan(0);
  });
});
