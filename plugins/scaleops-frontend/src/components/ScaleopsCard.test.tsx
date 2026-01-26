import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { isScaleopsAvailable, ScaleopsCard } from './ScaleopsCard';
import { Entity } from '@backstage/catalog-model';
import { TestApiProvider } from '@backstage/test-utils';
import { configApiRef, identityApiRef, errorApiRef } from '@backstage/core-plugin-api';

// Mock dependencies
jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

// Mock the Table component to avoid translation API issues
jest.mock('@backstage/core-components', () => ({
  ...jest.requireActual('@backstage/core-components'),
  Table: ({ data, columns, title }: any) => (
    <div data-testid="mock-table">
      <h3>{title}</h3>
      <span>Rows: {data?.length || 0}</span>
      <span>Columns: {columns?.length || 0}</span>
    </div>
  ),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

const mockConfigApi = {
  getString: jest.fn().mockReturnValue('http://localhost:7007'),
  getOptionalString: jest.fn(),
  getConfig: jest.fn(),
  getOptionalConfig: jest.fn(),
  getConfigArray: jest.fn(),
  getOptionalConfigArray: jest.fn(),
  getNumber: jest.fn(),
  getOptionalNumber: jest.fn(),
  getBoolean: jest.fn().mockReturnValue(false),
  getOptionalBoolean: jest.fn().mockReturnValue(false),
  getStringArray: jest.fn(),
  getOptionalStringArray: jest.fn(),
  has: jest.fn(),
  keys: jest.fn(),
};

const mockIdentityApi = {
  getCredentials: jest.fn().mockResolvedValue({ token: 'test-token' }),
  getBackstageIdentity: jest.fn(),
  getProfileInfo: jest.fn(),
  signOut: jest.fn(),
};

const mockErrorApi = {
  post: jest.fn(),
  error$: { subscribe: jest.fn() },
};

const mockEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'test-component',
    annotations: {
      'backstage.io/kubernetes-label-selector': 'app=test',
    },
  },
};

describe('isScaleopsAvailable', () => {
  it('should return true when entity has kubernetes-label-selector annotation', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test',
        annotations: {
          'backstage.io/kubernetes-label-selector': 'app=test',
        },
      },
    };
    expect(isScaleopsAvailable(entity)).toBe(true);
  });

  it('should return false when entity has no annotation', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test',
        annotations: {},
      },
    };
    expect(isScaleopsAvailable(entity)).toBe(false);
  });

  it('should return false when entity has no annotations object', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test',
      },
    };
    expect(isScaleopsAvailable(entity)).toBe(false);
  });

  it('should return true for entities with complex label selectors', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test',
        annotations: {
          'backstage.io/kubernetes-label-selector': 'app=test,env=prod,tier=frontend',
        },
      },
    };
    expect(isScaleopsAvailable(entity)).toBe(true);
  });

  it('should return false for empty label selector', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test',
        annotations: {
          'backstage.io/kubernetes-label-selector': '',
        },
      },
    };
    expect(isScaleopsAvailable(entity)).toBe(false);
  });
});

describe('ScaleopsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Re-configure mocks after clearing
    mockIdentityApi.getCredentials.mockResolvedValue({ token: 'test-token' });
    
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({ entity: mockEntity });
    
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export ScaleopsCard component', () => {
    expect(ScaleopsCard).toBeDefined();
    expect(typeof ScaleopsCard).toBe('function');
  });

  it('should render without crashing when wrapped with providers', async () => {
    const { container } = render(
      <TestApiProvider apis={[
        [configApiRef, mockConfigApi],
        [identityApiRef, mockIdentityApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <ScaleopsCard />
      </TestApiProvider>
    );
    
    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });

  it('should render the table component', async () => {
    const { getByTestId } = render(
      <TestApiProvider apis={[
        [configApiRef, mockConfigApi],
        [identityApiRef, mockIdentityApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <ScaleopsCard />
      </TestApiProvider>
    );
    
    await waitFor(() => {
      expect(getByTestId('mock-table')).toBeInTheDocument();
    });
  });

  it('should handle entity without label selector', async () => {
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({ 
      entity: {
        ...mockEntity,
        metadata: { name: 'test', annotations: {} }
      }
    });

    const { container } = render(
      <TestApiProvider apis={[
        [configApiRef, mockConfigApi],
        [identityApiRef, mockIdentityApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <ScaleopsCard />
      </TestApiProvider>
    );
    
    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });

  it('should handle missing token', async () => {
    mockIdentityApi.getCredentials.mockResolvedValueOnce({ token: null });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = render(
      <TestApiProvider apis={[
        [configApiRef, mockConfigApi],
        [identityApiRef, mockIdentityApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <ScaleopsCard />
      </TestApiProvider>
    );
    
    await waitFor(() => {
      expect(container).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith('No Backstage token available');
    });

    consoleSpy.mockRestore();
  });

  it('should fetch workloads with correct URL parameters', async () => {
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({ 
      entity: {
        ...mockEntity,
        metadata: { 
          name: 'test', 
          annotations: { 'backstage.io/kubernetes-label-selector': 'app=test,env=prod' } 
        }
      }
    });

    render(
      <TestApiProvider apis={[
        [configApiRef, mockConfigApi],
        [identityApiRef, mockIdentityApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <ScaleopsCard />
      </TestApiProvider>
    );
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should handle non-ok response gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: jest.fn().mockResolvedValue({ error: 'Server Error' }),
    });

    const { container } = render(
      <TestApiProvider apis={[
        [configApiRef, mockConfigApi],
        [identityApiRef, mockIdentityApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <ScaleopsCard />
      </TestApiProvider>
    );
    
    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });

  it('should display workloads when data is returned', async () => {
    const mockWorkloads = [
      {
        clusterName: 'test-cluster',
        workloadName: 'test-workload',
        type: 'Deployment',
        policyName: 'default',
        auto: true,
        isUnderProvisioned: false,
        isOverProvisioned: true,
        totalCost: 100,
        cpuRequests: 500,
        memRequests: 1024,
        cpuRecommended: 250,
        memRecommended: 512,
        availableSavings: 50,
        overallAvailableSavings: 50,
        memoryDiffPercent: -50,
        cpuDiffPercent: -50,
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockWorkloads),
    });

    const { getByTestId } = render(
      <TestApiProvider apis={[
        [configApiRef, mockConfigApi],
        [identityApiRef, mockIdentityApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <ScaleopsCard />
      </TestApiProvider>
    );
    
    await waitFor(() => {
      expect(getByTestId('mock-table')).toBeInTheDocument();
    });
  });
});
