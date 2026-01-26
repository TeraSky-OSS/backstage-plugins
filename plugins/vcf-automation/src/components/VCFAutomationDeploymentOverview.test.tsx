import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { VCFAutomationDeploymentOverview } from './VCFAutomationDeploymentOverview';
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
  getDeploymentDetails: jest.fn(),
};

const mockErrorApi = {
  post: jest.fn(),
  error$: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
};

const mockEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'test-deployment',
    annotations: {
      'terasky.backstage.io/vcf-automation-instance': 'prod-vcf',
    },
  },
};

const mockDeploymentDetails = {
  name: 'Test Deployment',
  status: 'RUNNING',
  createdBy: 'admin@example.com',
  createdAt: '2024-01-15T10:30:00Z',
  lastUpdatedBy: 'user@example.com',
  lastUpdatedAt: '2024-01-16T14:20:00Z',
  expense: {
    totalExpense: 150.50,
    computeExpense: 100.00,
    storageExpense: 30.25,
    additionalExpense: 20.25,
    unit: 'USD',
  },
};

describe('VCFAutomationDeploymentOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getDeploymentDetails.mockResolvedValue(mockDeploymentDetails);
    
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({ entity: mockEntity });
    
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: true, loading: false });
  });

  it('should be defined', () => {
    expect(VCFAutomationDeploymentOverview).toBeDefined();
  });

  it('should render loading state when permission is loading', async () => {
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: false, loading: true });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationDeploymentOverview />
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
        <VCFAutomationDeploymentOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
    });
  });

  it('should render deployment details when data is loaded', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationDeploymentOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Deployment')).toBeInTheDocument();
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });
  });

  it('should display expense information', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationDeploymentOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Expenses')).toBeInTheDocument();
      expect(screen.getByText(/150.5.*USD/)).toBeInTheDocument();
      expect(screen.getByText(/100.*USD/)).toBeInTheDocument();
      expect(screen.getByText(/30.25.*USD/)).toBeInTheDocument();
      expect(screen.getByText(/20.25.*USD/)).toBeInTheDocument();
    });
  });

  it('should handle missing deployment ID', async () => {
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({
      entity: { ...mockEntity, metadata: { name: '' } },
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationDeploymentOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No deployment ID found/i)).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    mockApi.getDeploymentDetails.mockRejectedValue(new Error('API Error'));

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationDeploymentOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
    });
  });

  it('should handle missing deployment details', async () => {
    mockApi.getDeploymentDetails.mockResolvedValue(undefined);

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationDeploymentOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No deployment details available/i)).toBeInTheDocument();
    });
  });

  it('should handle missing expense data', async () => {
    mockApi.getDeploymentDetails.mockResolvedValue({
      ...mockDeploymentDetails,
      expense: null,
    });

    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationDeploymentOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    });
  });

  it('should call API with correct parameters', async () => {
    render(
      <TestApiProvider apis={[
        [vcfAutomationApiRef, mockApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <VCFAutomationDeploymentOverview />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(mockApi.getDeploymentDetails).toHaveBeenCalledWith(
        'test-deployment',
        'prod-vcf'
      );
    });
  });
});
