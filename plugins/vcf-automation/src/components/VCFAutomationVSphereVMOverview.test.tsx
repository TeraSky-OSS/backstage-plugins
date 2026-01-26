import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { VCFAutomationVSphereVMOverview } from './VCFAutomationVSphereVMOverview';
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
  error$: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
};

const mockEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'test-vm',
    annotations: {
      'terasky.backstage.io/vcf-automation-instance': 'prod-vcf',
    },
  },
  spec: {
    system: 'test-deployment',
  },
};

const mockVMDetails = {
  name: 'Test VM',
  type: 'Cloud.vSphere.Machine',
  state: 'SUCCESS',
  syncStatus: 'OK',
  createdAt: '2024-01-15T10:30:00Z',
  properties: {
    region: 'us-west-1',
    cpuCount: 8,
    memoryGB: 32,
    storage: {
      disks: [{ capacityGb: 200 }],
    },
  },
  expense: {
    totalExpense: 250.75,
    computeExpense: 180.00,
    storageExpense: 70.75,
  },
};

describe('VCFAutomationVSphereVMOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getVSphereVMDetails.mockResolvedValue(mockVMDetails);
    
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({ entity: mockEntity });
    
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: true, loading: false });
  });

  it('should be defined', () => {
    expect(VCFAutomationVSphereVMOverview).toBeDefined();
  });

  it('should render loading state when permission is loading', async () => {
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: false, loading: true });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationVSphereVMOverview />
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
        <VCFAutomationVSphereVMOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
    });
  });

  it('should render VM details when data is loaded', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationVSphereVMOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test VM')).toBeInTheDocument();
      expect(screen.getByText('Cloud.vSphere.Machine')).toBeInTheDocument();
    });
  });

  it('should display VM metrics', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationVSphereVMOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/CPU: 8 cores/)).toBeInTheDocument();
      expect(screen.getByText(/Memory: 32 GB/)).toBeInTheDocument();
      expect(screen.getByText(/Storage: 200 GB/)).toBeInTheDocument();
    });
  });

  it('should display VM expense information', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationVSphereVMOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Total: \$250.75/)).toBeInTheDocument();
      expect(screen.getByText(/Compute: \$180.00/)).toBeInTheDocument();
      expect(screen.getByText(/Storage: \$70.75/)).toBeInTheDocument();
    });
  });

  it('should display region information', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationVSphereVMOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Region')).toBeInTheDocument();
      expect(screen.getByText('us-west-1')).toBeInTheDocument();
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
        <VCFAutomationVSphereVMOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No resource ID or deployment ID found/i)).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    mockApi.getVSphereVMDetails.mockRejectedValue(new Error('VM API Error'));

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationVSphereVMOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/VM API Error/i)).toBeInTheDocument();
    });
  });

  it('should handle missing VM details', async () => {
    mockApi.getVSphereVMDetails.mockResolvedValue(undefined);

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationVSphereVMOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No resource details available/i)).toBeInTheDocument();
    });
  });

  it('should handle VM with ERROR state', async () => {
    mockApi.getVSphereVMDetails.mockResolvedValue({
      ...mockVMDetails,
      state: 'ERROR',
      syncStatus: 'FAILED',
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationVSphereVMOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('ERROR')).toBeInTheDocument();
      expect(screen.getByText('FAILED')).toBeInTheDocument();
    });
  });

  it('should handle VM with null state/syncStatus', async () => {
    mockApi.getVSphereVMDetails.mockResolvedValue({
      ...mockVMDetails,
      state: null,
      syncStatus: null,
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationVSphereVMOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test VM')).toBeInTheDocument();
    });
  });

  it('should handle missing optional properties', async () => {
    mockApi.getVSphereVMDetails.mockResolvedValue({
      ...mockVMDetails,
      properties: null,
      expense: null,
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationVSphereVMOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Region/)).toBeInTheDocument();
    });
  });

  it('should call API with correct parameters', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationVSphereVMOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(mockApi.getVSphereVMDetails).toHaveBeenCalledWith(
        'test-deployment',
        'test-vm',
        'prod-vcf'
      );
    });
  });
});
