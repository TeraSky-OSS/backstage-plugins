import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { VCFOperationsExplorer } from './VCFOperationsExplorer';
import { TestApiProvider } from '@backstage/test-utils';
import { errorApiRef } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { vcfOperationsApiRef, VcfOperationsApiError } from '../api/VcfOperationsClient';

// Mock dependencies
jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

// Mock MetricChart to avoid complex chart rendering
jest.mock('./MetricChart', () => ({
  MetricChart: ({ metric }: { metric: string }) => (
    <div data-testid={`metric-chart-${metric}`}>Chart: {metric}</div>
  ),
}));

// Mock NotImplementedMessage
jest.mock('./NotImplementedMessage', () => ({
  NotImplementedMessage: ({ entityKind }: { entityKind?: string }) => (
    <div data-testid="not-implemented">Not Implemented: {entityKind}</div>
  ),
}));

// Mock material-ui/core makeStyles to avoid complex styling issues
jest.mock('@material-ui/core/styles', () => ({
  ...jest.requireActual('@material-ui/core/styles'),
  makeStyles: () => () => ({}),
}));

const mockApi = {
  getInstances: jest.fn(),
  findResourceByName: jest.fn(),
  findResourceForEntity: jest.fn(),
  getMetrics: jest.fn(),
};

const mockErrorApi = {
  post: jest.fn(),
  error$: { subscribe: jest.fn() },
};

const mockVMEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'test-vm',
    annotations: {
      'terasky.backstage.io/vcf-automation-instance': 'prod-vcf',
    },
    tags: ['kind:virtualmachine'],
  },
  spec: {
    type: 'Cloud.vSphere.Machine',
  },
};

describe('VCFOperationsExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    mockApi.getInstances.mockResolvedValue([]);
    mockApi.findResourceByName.mockResolvedValue(null);
    mockApi.findResourceForEntity.mockResolvedValue(null);
    mockApi.getMetrics.mockResolvedValue([]);
    
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({ entity: mockVMEntity });
  });

  it('should be defined', () => {
    expect(VCFOperationsExplorer).toBeDefined();
  });

  it('should be a function component', () => {
    expect(typeof VCFOperationsExplorer).toBe('function');
  });

  it('should render without crashing', async () => {
    const { container } = render(
      <TestApiProvider apis={[
        [vcfOperationsApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFOperationsExplorer />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });

  it('should call getInstances on mount', async () => {
    render(
      <TestApiProvider apis={[
        [vcfOperationsApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFOperationsExplorer />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(mockApi.getInstances).toHaveBeenCalled();
    });
  });

  it('should show loading state initially', async () => {
    render(
      <TestApiProvider apis={[
        [vcfOperationsApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFOperationsExplorer />
      </TestApiProvider>
    );

    // The component shows a loading spinner initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should handle entity without tags', async () => {
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({
      entity: {
        ...mockVMEntity,
        metadata: { ...mockVMEntity.metadata, tags: undefined },
      },
    });

    const { container } = render(
      <TestApiProvider apis={[
        [vcfOperationsApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFOperationsExplorer />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });

  it('should handle entity without spec type', async () => {
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({
      entity: {
        ...mockVMEntity,
        spec: {},
      },
    });

    const { container } = render(
      <TestApiProvider apis={[
        [vcfOperationsApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFOperationsExplorer />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });

  it('should handle entity with Kubernetes kind tag', async () => {
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({
      entity: {
        ...mockVMEntity,
        metadata: { ...mockVMEntity.metadata, tags: ['kind:kubernetes'] },
      },
    });

    const { container } = render(
      <TestApiProvider apis={[
        [vcfOperationsApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFOperationsExplorer />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(mockApi.getInstances).toHaveBeenCalled();
    });
  });

  it('should handle entity with Host kind tag', async () => {
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({
      entity: {
        ...mockVMEntity,
        metadata: { ...mockVMEntity.metadata, tags: ['kind:host'] },
      },
    });

    const { container } = render(
      <TestApiProvider apis={[
        [vcfOperationsApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFOperationsExplorer />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(mockApi.getInstances).toHaveBeenCalled();
    });
  });
});

// Test VcfOperationsApiError class
describe('VcfOperationsApiError', () => {
  it('should create error with message and status', () => {
    const error = new VcfOperationsApiError('Test error', 403);
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(403);
    expect(error.name).toBe('VcfOperationsApiError');
  });

  it('should be instance of Error', () => {
    const error = new VcfOperationsApiError('Test', 500);
    expect(error).toBeInstanceOf(Error);
  });
});
