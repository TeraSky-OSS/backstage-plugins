import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricChart } from './MetricChart';

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('MetricChart', () => {
  it('should be defined', () => {
    expect(MetricChart).toBeDefined();
  });

  it('should render no data message when data is empty', () => {
    const emptyData = {
      stat: {
        timestamps: [],
        data: [],
        statKey: { key: 'test-metric' },
      },
    };

    render(<MetricChart data={emptyData as any} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should render chart when data is present', () => {
    const data = {
      stat: {
        timestamps: [1704067200000, 1704070800000, 1704074400000],
        data: [100, 150, 200],
        statKey: { key: 'cpu-usage' },
      },
    };

    render(<MetricChart data={data as any} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should accept custom height prop', () => {
    const data = {
      stat: {
        timestamps: [1704067200000],
        data: [100],
        statKey: { key: 'memory-usage' },
      },
    };

    const { container } = render(<MetricChart data={data as any} height={400} />);

    expect(container).toBeInTheDocument();
  });

  it('should handle missing timestamps gracefully', () => {
    const data = {
      stat: {
        timestamps: undefined,
        data: [100],
        statKey: { key: 'test' },
      },
    };

    render(<MetricChart data={data as any} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should handle missing data array gracefully', () => {
    const data = {
      stat: {
        timestamps: [1704067200000],
        data: undefined,
        statKey: { key: 'test' },
      },
    };

    render(<MetricChart data={data as any} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});
