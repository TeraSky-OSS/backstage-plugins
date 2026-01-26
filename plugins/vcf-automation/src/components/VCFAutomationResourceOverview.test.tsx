import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { VCFAutomationResourceOverview } from './VCFAutomationResourceOverview';
import { TestApiProvider } from '@backstage/test-utils';
import { errorApiRef } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { vcfAutomationApiRef } from '../api/VcfAutomationClient';

// Mock dependencies
jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(),
}));

// Mock Backstage core components that require translation API
jest.mock('@backstage/core-components', () => ({
  InfoCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="info-card">
      <h2>{title}</h2>
      {children}
    </div>
  ),
  Progress: () => <div role="progressbar">Loading...</div>,
  ResponseErrorPanel: ({ error }: { error: Error }) => (
    <div data-testid="error-panel">{error.message}</div>
  ),
  StatusOK: () => <span data-testid="status-ok">✓</span>,
  StatusError: () => <span data-testid="status-error">✗</span>,
  StatusPending: () => <span data-testid="status-pending">⏳</span>,
}));

const mockApi = {
  getVSphereVMDetails: jest.fn(),
};

const mockErrorApi = {
  post: jest.fn(),
  error$: { subscribe: jest.fn() },
};

const mockEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'test-resource',
    annotations: {
      'terasky.backstage.io/vcf-automation-instance': 'prod-vcf',
    },
  },
  spec: {
    system: 'test-deployment',
  },
};

const mockResourceDetails = {
  name: 'Test Resource',
  type: 'Cloud.vSphere.Machine',
  state: 'SUCCESS',
  syncStatus: 'OK',
  createdAt: '2024-01-15T10:30:00Z',
  properties: {
    region: 'us-west-1',
    cpuCount: 4,
    memoryGB: 16,
    storage: {
      disks: [{ capacityGb: 100 }],
    },
  },
  expense: {
    totalExpense: 150.50,
    computeExpense: 100.00,
    storageExpense: 50.50,
  },
};

describe('VCFAutomationResourceOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getVSphereVMDetails.mockResolvedValue(mockResourceDetails);
    
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({ entity: mockEntity });
    
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: true, loading: false });
  });

  it('should be defined', () => {
    expect(VCFAutomationResourceOverview).toBeDefined();
  });

  it('should render loading state when permission is loading', async () => {
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: false, loading: true });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render permission denied message when user lacks permission', async () => {
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: false, loading: false });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
    });
  });

  it('should render resource details when data is loaded', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Resource')).toBeInTheDocument();
      expect(screen.getByText('Cloud.vSphere.Machine')).toBeInTheDocument();
    });
  });

  it('should display state with status icon', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('State')).toBeInTheDocument();
      expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    });
  });

  it('should display sync status with status icon', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Sync Status')).toBeInTheDocument();
      expect(screen.getByText('OK')).toBeInTheDocument();
    });
  });

  it('should display resource metrics', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Resource Metrics')).toBeInTheDocument();
      expect(screen.getByText(/CPU: 4 cores/)).toBeInTheDocument();
      expect(screen.getByText(/Memory: 16 GB/)).toBeInTheDocument();
      expect(screen.getByText(/Storage: 100 GB/)).toBeInTheDocument();
    });
  });

  it('should display expense information', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Expense Information')).toBeInTheDocument();
      expect(screen.getByText(/Total: \$150.50/)).toBeInTheDocument();
      expect(screen.getByText(/Compute: \$100.00/)).toBeInTheDocument();
      expect(screen.getByText(/Storage: \$50.50/)).toBeInTheDocument();
    });
  });

  it('should handle missing resource ID or deployment ID', async () => {
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({
      entity: { ...mockEntity, metadata: { name: '' }, spec: {} },
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No resource ID or deployment ID found/i)).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    mockApi.getVSphereVMDetails.mockRejectedValue(new Error('API Error'));

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-panel')).toBeInTheDocument();
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
    });
  });

  it('should handle missing resource details', async () => {
    mockApi.getVSphereVMDetails.mockResolvedValue(undefined);

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No resource details available/i)).toBeInTheDocument();
    });
  });

  it('should handle resource with ERROR state', async () => {
    mockApi.getVSphereVMDetails.mockResolvedValue({
      ...mockResourceDetails,
      state: 'ERROR',
      syncStatus: 'FAILED',
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('ERROR')).toBeInTheDocument();
      expect(screen.getByText('FAILED')).toBeInTheDocument();
    });
  });

  it('should handle resource with PENDING state', async () => {
    mockApi.getVSphereVMDetails.mockResolvedValue({
      ...mockResourceDetails,
      state: 'PENDING',
      syncStatus: 'IN_PROGRESS',
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
    });
  });

  it('should handle missing optional properties', async () => {
    mockApi.getVSphereVMDetails.mockResolvedValue({
      ...mockResourceDetails,
      properties: {},
      expense: null,
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/CPU: N\/A/)).toBeInTheDocument();
      expect(screen.getByText(/Memory: N\/A/)).toBeInTheDocument();
      expect(screen.getByText(/Total: \$N\/A/)).toBeInTheDocument();
    });
  });

  it('should call API with correct parameters', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationResourceOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(mockApi.getVSphereVMDetails).toHaveBeenCalledWith(
        'test-deployment',
        'test-resource',
        'prod-vcf'
      );
    });
  });
});
