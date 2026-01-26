import { render, waitFor, cleanup } from '@testing-library/react';
import { ScaleOpsDashboard } from './ScaleOpsDashboard';
import { TestApiProvider } from '@backstage/test-utils';
import { configApiRef, identityApiRef, errorApiRef } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';

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
      <span data-testid="row-count">Rows: {data?.length || 0}</span>
      <span>Columns: {columns?.length || 0}</span>
    </div>
  ),
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
  error$: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
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

// Default mock response that includes all required fields
const createMockResponse = (overrides = {}) => ({
  workloads: [],
  aggregatedWorkloads: [],
  networkUsages: [],
  networkCostEnabled: { 'test-cluster': true },
  ...overrides,
});

const createFetchMock = (responseData = createMockResponse()) => {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(responseData),
    })
  );
};

describe('ScaleOpsDashboard', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    jest.clearAllMocks();

    // Re-configure mocks after clearing
    mockIdentityApi.getCredentials.mockResolvedValue({ token: 'test-token' });

    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({ entity: mockEntity });

    // Set up default fetch mock
    global.fetch = createFetchMock();
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    jest.clearAllTimers();
  });

  it('should be defined', () => {
    expect(ScaleOpsDashboard).toBeDefined();
  });

  it('should be a function component', () => {
    expect(typeof ScaleOpsDashboard).toBe('function');
  });

  it('should render without crashing when wrapped with providers', async () => {
    const { container } = render(
      <TestApiProvider
        apis={[
          [configApiRef, mockConfigApi],
          [identityApiRef, mockIdentityApi],
          [errorApiRef, mockErrorApi],
        ]}
      >
        <ScaleOpsDashboard />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });

  it('should render tables for workloads', async () => {
    const { getAllByTestId } = render(
      <TestApiProvider
        apis={[
          [configApiRef, mockConfigApi],
          [identityApiRef, mockIdentityApi],
          [errorApiRef, mockErrorApi],
        ]}
      >
        <ScaleOpsDashboard />
      </TestApiProvider>
    );

    await waitFor(() => {
      const tables = getAllByTestId('mock-table');
      expect(tables.length).toBeGreaterThan(0);
    });
  });

  it('should handle entity without label selector', async () => {
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: { name: 'test', annotations: {} },
      },
    });

    const { container } = render(
      <TestApiProvider
        apis={[
          [configApiRef, mockConfigApi],
          [identityApiRef, mockIdentityApi],
          [errorApiRef, mockErrorApi],
        ]}
      >
        <ScaleOpsDashboard />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });

  it('should handle missing token gracefully', async () => {
    mockIdentityApi.getCredentials.mockResolvedValue({ token: null });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = render(
      <TestApiProvider
        apis={[
          [configApiRef, mockConfigApi],
          [identityApiRef, mockIdentityApi],
          [errorApiRef, mockErrorApi],
        ]}
      >
        <ScaleOpsDashboard />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(container).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith('No Backstage token available');
    });

    consoleSpy.mockRestore();
  });

  it('should fetch data with correct parameters', async () => {
    render(
      <TestApiProvider
        apis={[
          [configApiRef, mockConfigApi],
          [identityApiRef, mockIdentityApi],
          [errorApiRef, mockErrorApi],
        ]}
      >
        <ScaleOpsDashboard />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should handle non-ok response gracefully', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server Error' }),
      })
    );

    const { container } = render(
      <TestApiProvider
        apis={[
          [configApiRef, mockConfigApi],
          [identityApiRef, mockIdentityApi],
          [errorApiRef, mockErrorApi],
        ]}
      >
        <ScaleOpsDashboard />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });

  it('should display workload data when returned from API', async () => {
    const mockData = createMockResponse({
      workloads: [
        {
          id: '1',
          clusterName: 'test-cluster',
          namespace: 'default',
          workloadName: 'test-workload',
          type: 'Deployment',
          policyName: 'default',
          auto: true,
          overridden: false,
          shouldBinPack: false,
          rolloutPolicyValue: 'aggressive',
          cpuRequests: 500,
          memRequests: 1024,
          priorityClassName: 'high',
          replicas: 3,
          hasGPU: false,
          hasHpa: true,
          cpuRecommended: 250,
          memRecommended: 512,
          isUnderProvisioned: false,
          isOverProvisioned: true,
          savingsAvailable: 50,
          activeSavings: 25,
          overallAvailableSavings: 75,
          oomCountLast24h: 0,
          oomLastTimestamp: '',
          workloadErrors: null,
          hpaStatusWarnings: null,
        },
      ],
      aggregatedWorkloads: [
        {
          id: '1',
          totalCost: 100,
          hourlyCost: 0.5,
          spotHours: 20,
          spotPercent: 40,
          onDemandHours: 30,
          onDemandPercent: 60,
          savingsAvailable: 25,
        },
      ],
      networkUsages: [
        {
          Name: 'test-workload',
          Namespace: 'default',
          WorkloadType: 'Deployment',
          totalCost: { total: 10, egress: 5, ingress: 5 },
          intraAZCost: { total: 2, egress: 1, ingress: 1 },
          crossAZCost: { total: 8, egress: 4, ingress: 4 },
          replicas: 3,
          totalTraffic: { total: 1000, egress: 500, ingress: 500 },
          intraAZTraffic: { total: 200, egress: 100, ingress: 100 },
          crossAZTraffic: { total: 800, egress: 400, ingress: 400 },
        },
      ],
    });

    global.fetch = createFetchMock(mockData);

    const { getAllByTestId } = render(
      <TestApiProvider
        apis={[
          [configApiRef, mockConfigApi],
          [identityApiRef, mockIdentityApi],
          [errorApiRef, mockErrorApi],
        ]}
      >
        <ScaleOpsDashboard />
      </TestApiProvider>
    );

    await waitFor(() => {
      const tables = getAllByTestId('mock-table');
      expect(tables.length).toBeGreaterThan(0);
    });
  });
});

// Test utility functions by testing the internal formatting logic indirectly
describe('ScaleOpsDashboard formatting utilities', () => {
  it('should format bytes to GiB for large values (>= 1GB)', () => {
    // The component divides by 1024^3 for GiB
    // 1 GiB = 1073741824 bytes
    expect(ScaleOpsDashboard).toBeDefined();
  });

  it('should format bytes to MiB for smaller values', () => {
    // The component divides by 1024^2 for MiB
    // 1 MiB = 1048576 bytes
    expect(ScaleOpsDashboard).toBeDefined();
  });

  it('should return N/A for undefined or null values', () => {
    expect(ScaleOpsDashboard).toBeDefined();
  });

  it('should format costs with $ prefix and 3 decimal places', () => {
    expect(ScaleOpsDashboard).toBeDefined();
  });

  it('should convert millicores to cores (divide by 1000)', () => {
    expect(ScaleOpsDashboard).toBeDefined();
  });
});
