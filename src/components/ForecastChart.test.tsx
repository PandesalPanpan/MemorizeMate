import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ForecastChart } from './ForecastChart';

describe('ForecastChart', () => {
  it('renders the correct number of bars', () => {
    const data = [
      { date: 'Mon, May 30', count: 3 },
      { date: 'Tue, May 31', count: 5 },
      { date: 'Wed, Jun 1', count: 0 },
    ];
    render(<ForecastChart data={data} />);
    // Should render 3 count labels
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
    // Should render 3 date labels
    expect(screen.getByText('Mon, May 30')).toBeTruthy();
    expect(screen.getByText('Tue, May 31')).toBeTruthy();
    expect(screen.getByText('Wed, Jun 1')).toBeTruthy();
  });

  it('shows empty message when all counts are 0', () => {
    const data = [
      { date: 'Mon, May 30', count: 0 },
      { date: 'Tue, May 31', count: 0 },
    ];
    render(<ForecastChart data={data} />);
    expect(screen.getByText('No reviews scheduled')).toBeTruthy();
  });

  it('renders single bar for one data point', () => {
    const data = [{ date: 'Mon, May 30', count: 7 }];
    render(<ForecastChart data={data} />);
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('Mon, May 30')).toBeTruthy();
  });

  it('handles empty data array by showing empty message', () => {
    render(<ForecastChart data={[]} />);
    expect(screen.getByText('No reviews scheduled')).toBeTruthy();
  });
});
