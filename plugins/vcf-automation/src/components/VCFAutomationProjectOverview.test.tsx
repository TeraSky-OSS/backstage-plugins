import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { VCFAutomationProjectOverview } from './VCFAutomationProjectOverview';
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
}));

const mockApi = {
  getProjectDetails: jest.fn(),
};

const mockErrorApi = {
  post: jest.fn(),
  error$: { subscribe: jest.fn() },
};

const mockEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'test-project',
    annotations: {
      'terasky.backstage.io/vcf-automation-instance': 'prod-vcf',
    },
  },
};

const mockProjectDetails = {
  name: 'Test Project',
  description: 'A test project for VCF Automation',
  administrators: [
    { email: 'admin1@example.com', type: 'User' },
    { email: 'admin2@example.com', type: 'Group' },
  ],
  zones: [
    {
      id: 'zone-1',
      zoneId: 'us-west-1',
      allocatedInstancesCount: 5,
      maxNumberInstances: 20,
      allocatedMemoryMB: 8192,
      memoryLimitMB: 32768,
      allocatedCpu: 4,
      cpuLimit: 16,
      allocatedStorageGB: 100,
      storageLimitGB: 500,
    },
  ],
  sharedResources: true,
  placementPolicy: 'DEFAULT',
  orgId: 'org-123',
  operationTimeout: 60,
};

describe('VCFAutomationProjectOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getProjectDetails.mockResolvedValue(mockProjectDetails);
    
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({ entity: mockEntity });
    
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: true, loading: false });
  });

  it('should be defined', () => {
    expect(VCFAutomationProjectOverview).toBeDefined();
  });

  it('should render loading state when permission is loading', async () => {
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: false, loading: true });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
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
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
    });
  });

  it('should render project details when data is loaded', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('A test project for VCF Automation')).toBeInTheDocument();
    });
  });

  it('should display administrator chips', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('admin1@example.com (User)')).toBeInTheDocument();
      expect(screen.getByText('admin2@example.com (Group)')).toBeInTheDocument();
    });
  });

  it('should display zone resource allocation', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Resource Allocation')).toBeInTheDocument();
      expect(screen.getByText(/Zone:.*us-west-1/)).toBeInTheDocument();
      expect(screen.getByText('5 / 20')).toBeInTheDocument();
      expect(screen.getByText('8192 / 32768')).toBeInTheDocument();
      expect(screen.getByText('4 / 16')).toBeInTheDocument();
      expect(screen.getByText('100 / 500')).toBeInTheDocument();
    });
  });

  it('should display shared resources', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Shared Resources')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });
  });

  it('should display placement policy', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Placement Policy')).toBeInTheDocument();
      expect(screen.getByText('DEFAULT')).toBeInTheDocument();
    });
  });

  it('should display organization ID', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Organization ID')).toBeInTheDocument();
      expect(screen.getByText('org-123')).toBeInTheDocument();
    });
  });

  it('should display operation timeout', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Operation Timeout')).toBeInTheDocument();
      expect(screen.getByText('60 minutes')).toBeInTheDocument();
    });
  });

  it('should handle missing project ID', async () => {
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({
      entity: { ...mockEntity, metadata: { name: '' } },
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No project ID found/i)).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    mockApi.getProjectDetails.mockRejectedValue(new Error('API Error'));

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
    });
  });

  it('should handle missing project details', async () => {
    mockApi.getProjectDetails.mockResolvedValue(undefined);

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No project details available/i)).toBeInTheDocument();
    });
  });

  it('should handle project with no administrators', async () => {
    mockApi.getProjectDetails.mockResolvedValue({
      ...mockProjectDetails,
      administrators: [],
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No administrators configured/i)).toBeInTheDocument();
    });
  });

  it('should handle project with no zones', async () => {
    mockApi.getProjectDetails.mockResolvedValue({
      ...mockProjectDetails,
      zones: [],
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.queryByText('Resource Allocation')).not.toBeInTheDocument();
    });
  });

  it('should handle project with no description', async () => {
    mockApi.getProjectDetails.mockResolvedValue({
      ...mockProjectDetails,
      description: null,
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No description')).toBeInTheDocument();
    });
  });

  it('should call API with correct parameters', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(mockApi.getProjectDetails).toHaveBeenCalledWith(
        'test-project',
        'prod-vcf'
      );
    });
  });

  it('should handle zone with unlimited resources', async () => {
    mockApi.getProjectDetails.mockResolvedValue({
      ...mockProjectDetails,
      zones: [
        {
          id: 'zone-1',
          zoneId: 'us-west-1',
          allocatedInstancesCount: 5,
          maxNumberInstances: null,
          allocatedMemoryMB: 8192,
          memoryLimitMB: null,
          allocatedCpu: 4,
          cpuLimit: null,
          allocatedStorageGB: 100,
          storageLimitGB: null,
        },
      ],
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationProjectOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('5 / Unlimited')).toBeInTheDocument();
      expect(screen.getByText('8192 / Unlimited')).toBeInTheDocument();
      expect(screen.getByText('4 / Unlimited')).toBeInTheDocument();
      expect(screen.getByText('100 / Unlimited')).toBeInTheDocument();
    });
  });
});
