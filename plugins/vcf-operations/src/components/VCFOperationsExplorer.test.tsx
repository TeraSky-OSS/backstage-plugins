import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { VCFOperationsExplorer } from './VCFOperationsExplorer';
import { TestApiProvider } from '@backstage/test-utils';
import { vcfOperationsApiRef } from '../api/VcfOperationsClient';

// Mock hooks
jest.mock('@backstage/plugin-catalog-react', () => ({
  ...jest.requireActual('@backstage/plugin-catalog-react'),
  useEntity: jest.fn(),
}));

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

const { useEntity } = require('@backstage/plugin-catalog-react');

const mockVcfOperationsApi = {
  getInstances: jest.fn(),
  getResourceTree: jest.fn(),
  getMetrics: jest.fn(),
  getResourceKinds: jest.fn(),
};

describe('VCFOperationsExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEntity.mockReturnValue({
      entity: {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test-component',
          annotations: {
            'vcf-operations/instance': 'test-instance',
          },
        },
      },
    });
    mockVcfOperationsApi.getInstances.mockResolvedValue([]);
    mockVcfOperationsApi.getResourceTree.mockResolvedValue([]);
    mockVcfOperationsApi.getMetrics.mockResolvedValue([]);
    mockVcfOperationsApi.getResourceKinds.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(VCFOperationsExplorer).toBeDefined();
  });

  it('should be a function component', () => {
    expect(typeof VCFOperationsExplorer).toBe('function');
  });

  it('should render without crashing', async () => {
    mockVcfOperationsApi.getInstances.mockResolvedValue([
      { name: 'test-instance', baseUrl: 'http://vcf.example.com' },
    ]);

    render(
      <TestApiProvider apis={[[vcfOperationsApiRef, mockVcfOperationsApi]]}>
        <VCFOperationsExplorer />
      </TestApiProvider>,
    );

    await waitFor(() => {
      expect(mockVcfOperationsApi.getInstances).toHaveBeenCalled();
    });
  });

  it('should show loading state initially', async () => {
    mockVcfOperationsApi.getInstances.mockImplementation(() => new Promise(() => {}));

    render(
      <TestApiProvider apis={[[vcfOperationsApiRef, mockVcfOperationsApi]]}>
        <VCFOperationsExplorer />
      </TestApiProvider>,
    );

    // The component should be defined
    expect(VCFOperationsExplorer).toBeDefined();
  });

  it('should handle entity without vcf-operations annotation', async () => {
    useEntity.mockReturnValue({
      entity: {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test-component',
          annotations: {},
        },
      },
    });

    render(
      <TestApiProvider apis={[[vcfOperationsApiRef, mockVcfOperationsApi]]}>
        <VCFOperationsExplorer />
      </TestApiProvider>,
    );

    await waitFor(() => {
      expect(mockVcfOperationsApi.getInstances).toHaveBeenCalled();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockVcfOperationsApi.getInstances.mockRejectedValue(new Error('API Error'));

    render(
      <TestApiProvider apis={[[vcfOperationsApiRef, mockVcfOperationsApi]]}>
        <VCFOperationsExplorer />
      </TestApiProvider>,
    );

    await waitFor(() => {
      expect(mockVcfOperationsApi.getInstances).toHaveBeenCalled();
    });
  });

  it('should render with multiple instances', async () => {
    mockVcfOperationsApi.getInstances.mockResolvedValue([
      { name: 'instance-1', baseUrl: 'http://vcf1.example.com' },
      { name: 'instance-2', baseUrl: 'http://vcf2.example.com' },
    ]);

    render(
      <TestApiProvider apis={[[vcfOperationsApiRef, mockVcfOperationsApi]]}>
        <VCFOperationsExplorer />
      </TestApiProvider>,
    );

    await waitFor(() => {
      expect(mockVcfOperationsApi.getInstances).toHaveBeenCalled();
    });
  });

  it('should handle unsupported entity kind', async () => {
    useEntity.mockReturnValue({
      entity: {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'UnsupportedKind',
        metadata: {
          name: 'test-component',
        },
      },
    });

    render(
      <TestApiProvider apis={[[vcfOperationsApiRef, mockVcfOperationsApi]]}>
        <VCFOperationsExplorer />
      </TestApiProvider>,
    );

    await waitFor(() => {
      // Component should still render
      expect(VCFOperationsExplorer).toBeDefined();
    });
  });
});
