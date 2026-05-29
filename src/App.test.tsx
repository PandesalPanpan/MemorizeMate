import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { App } from './App';
import { NotFoundScreen } from './screens/NotFoundScreen';

describe('App', () => {
  it('renders the home route with the app name in nav', async () => {
    render(<App />);
    expect(await screen.findByRole('navigation')).toBeInTheDocument();
    expect(screen.getAllByText((_, el) => el?.textContent === 'MemorizeMate').length).toBeGreaterThan(0);
  });

  it('shows 404 page for unknown routes', async () => {
    render(
      <MemoryRouter initialEntries={['/nonexistent']}>
        <Routes>
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });
});
