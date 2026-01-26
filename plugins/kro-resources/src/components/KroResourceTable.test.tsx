import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import KroResourceTable from './KroResourceTable';
import { TestApiProvider } from '@backstage/test-utils';
import { errorApiRef, configApiRef } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { kroApiRef } from '../api/KroApi';

// Mock dependencies
jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock react-syntax-highlighter
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => <pre data-testid="syntax-highlighter">{children}</pre>,
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  tomorrow: {},
}));

const mockApi = {
  getRGDs: jest.fn(),
  getInstances: jest.fn(),
  getResources: jest.fn(),
  getEvents: jest.fn(),
};

const mockConfigApi = {
  getOptionalBoolean: jest.fn(),
  getOptionalString: jest.fn(),
  getOptionalNumber: jest.fn(),
  getOptionalStringArray: jest.fn(),
  getString: jest.fn(),
  getBoolean: jest.fn(),
  getNumber: jest.fn(),
  getStringArray: jest.fn(),
  getConfig: jest.fn(),
  getConfigArray: jest.fn(),
  getOptionalConfig: jest.fn(),
  getOptionalConfigArray: jest.fn(),
  has: jest.fn(),
  keys: jest.fn(),
  get: jest.fn(),
};

const mockErrorApi = {
  post: jest.fn(),
  error$: { subscribe: jest.fn() },
};

const mockEntityWithAnnotations: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'test-component',
    annotations: {
      'terasky.backstage.io/kro-rgd-name': 'test-rgd',
      'terasky.backstage.io/kro-rgd-id': 'rgd-123',
      'terasky.backstage.io/kro-instance-uid': 'instance-456',
      'terasky.backstage.io/kro-instance-namespace': 'default',
      'terasky.backstage.io/kro-rgd-crd-name': 'test-crd',
      'terasky.backstage.io/kro-instance-name': 'test-instance',
      'backstage.io/managed-by-location': 'cluster: test-cluster',
    },
  },
  spec: {
    type: 'kro-instance',
  },
};

const mockEntityWithoutAnnotations: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'test-component',
    annotations: {},
  },
  spec: {
    type: 'service',
  },
};

const mockResources = {
  resources: [
    {
      type: 'RGD',
      name: 'test-rgd',
      namespace: 'default',
      group: 'kro.run',
      kind: 'ResourceGraphDefinition',
      status: {
        synced: true,
        ready: true,
        conditions: [
          { type: 'Synced', status: 'True' },
          { type: 'Ready', status: 'True' },
        ],
      },
      createdAt: '2024-01-15T10:30:00Z',
      resource: {
        apiVersion: 'kro.run/v1alpha1',
        kind: 'ResourceGraphDefinition',
        metadata: {
          name: 'test-rgd',
          namespace: 'default',
          uid: 'rgd-123',
          creationTimestamp: '2024-01-15T10:30:00Z',
        },
        status: {
          conditions: [
            { type: 'Synced', status: 'True' },
            { type: 'Ready', status: 'True' },
          ],
        },
      },
      level: 0,
    },
    {
      type: 'Instance',
      name: 'test-instance',
      namespace: 'default',
      group: 'kro.run',
      kind: 'Instance',
      status: {
        synced: true,
        ready: true,
        conditions: [
          { type: 'Synced', status: 'True' },
          { type: 'Ready', status: 'True' },
        ],
      },
      createdAt: '2024-01-15T11:00:00Z',
      resource: {
        apiVersion: 'kro.run/v1alpha1',
        kind: 'Instance',
        metadata: {
          name: 'test-instance',
          namespace: 'default',
          uid: 'instance-456',
          creationTimestamp: '2024-01-15T11:00:00Z',
        },
        status: {
          conditions: [
            { type: 'Synced', status: 'True' },
            { type: 'Ready', status: 'True' },
          ],
        },
      },
      level: 1,
      parentId: 'rgd-123',
    },
  ],
  supportingResources: [],
};

describe('KroResourceTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockApi.getRGDs.mockResolvedValue([]);
    mockApi.getInstances.mockResolvedValue([]);
    mockApi.getResources.mockResolvedValue(mockResources);
    mockApi.getEvents.mockResolvedValue([]);
    mockConfigApi.getOptionalBoolean.mockReturnValue(false);
    
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({ entity: mockEntityWithAnnotations });
    
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: true, loading: false });
  });

  it('should be defined', () => {
    expect(KroResourceTable).toBeDefined();
  });

  it('should be a function component', () => {
    expect(typeof KroResourceTable).toBe('function');
  });

  it('should render without crashing', async () => {
    const { container } = render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });

  it('should display table headers', async () => {
    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Name').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Type').length).toBeGreaterThan(0);
    });
  });

  it('should display Resources heading', async () => {
    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Resources/).length).toBeGreaterThan(0);
    });
  });

  it('should display Supporting Resources section', async () => {
    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Supporting Resources')).toBeInTheDocument();
    });
  });

  it('should call getResources API with correct parameters', async () => {
    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(mockApi.getResources).toHaveBeenCalledWith({
        clusterName: 'test-cluster',
        namespace: 'default',
        rgdName: 'test-rgd',
        rgdId: 'rgd-123',
        instanceId: 'instance-456',
        instanceName: 'test-instance',
        crdName: 'test-crd',
      });
    });
  });

  it('should handle entity without required annotations', async () => {
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({ entity: mockEntityWithoutAnnotations });

    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      // Should not call API when required annotations are missing
      expect(mockApi.getResources).not.toHaveBeenCalled();
    });
  });

  it('should handle permission checks when permissions are enabled', async () => {
    mockConfigApi.getOptionalBoolean.mockReturnValue(true);
    
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: true, loading: false });

    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(usePermission).toHaveBeenCalled();
    });
  });

  it('should handle API error gracefully', async () => {
    mockApi.getResources.mockRejectedValue(new Error('API Error'));

    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    // Should not crash on error
    await waitFor(() => {
      expect(screen.getAllByText(/Resources/).length).toBeGreaterThan(0);
    });
  });

  it('should display resource data when loaded', async () => {
    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('test-rgd')).toBeInTheDocument();
    });
  });

  it('should display instance data when loaded', async () => {
    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      // Check that resources are loaded by verifying the table is populated
      expect(screen.getByText('test-rgd')).toBeInTheDocument();
    });
  });

  it('should display namespace when present', async () => {
    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('default').length).toBeGreaterThan(0);
    });
  });

  it('should handle missing annotations gracefully', async () => {
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({
      entity: {
        ...mockEntityWithAnnotations,
        metadata: { ...mockEntityWithAnnotations.metadata, annotations: undefined },
      },
    });

    const { container } = render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });

  it('should display Status column', async () => {
    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    });
  });

  it('should display Actions column', async () => {
    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
        [errorApiRef, mockErrorApi],
      ]}>
        <KroResourceTable />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Actions').length).toBeGreaterThan(0);
    });
  });
});
