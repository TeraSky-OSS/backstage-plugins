import React from 'react';
import { render, waitFor } from '@testing-library/react';
import KroResourceGraph from './KroResourceGraph';
import { TestApiProvider } from '@backstage/test-utils';
import { configApiRef } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { kroApiRef } from '../api/KroApi';

// Mock dependencies
jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(),
}));

// Mock ReactFlow
jest.mock('react-flow-renderer', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <div data-testid="react-flow">{children}</div>,
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MiniMap: () => <div data-testid="minimap" />,
  Controls: () => <div data-testid="controls" />,
  Background: () => <div data-testid="background" />,
  Handle: () => <div />,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}));

// Mock dagre
jest.mock('dagre', () => ({
  graphlib: {
    Graph: jest.fn().mockImplementation(() => ({
      setDefaultEdgeLabel: jest.fn(),
      setGraph: jest.fn(),
      setNode: jest.fn(),
      setEdge: jest.fn(),
      nodes: jest.fn().mockReturnValue([]),
      node: jest.fn().mockReturnValue({ x: 0, y: 0 }),
    })),
  },
  layout: jest.fn(),
}));

// Mock react-syntax-highlighter
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => <pre>{children}</pre>,
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  tomorrow: {},
}));

// Mock file-saver
jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

const mockApi = {
  getRGDs: jest.fn(),
  getInstances: jest.fn(),
  getResources: jest.fn(),
  getEvents: jest.fn(),
};

const mockConfigApi = {
  getOptionalBoolean: jest.fn().mockReturnValue(false),
  getOptionalString: jest.fn(),
  getString: jest.fn(),
  has: jest.fn(),
};

const mockEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'test-instance',
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

const mockResources = {
  resources: [
    {
      type: 'RGD',
      name: 'test-rgd',
      namespace: 'default',
      resource: { metadata: { name: 'test-rgd', uid: 'rgd-123' } },
    },
  ],
  supportingResources: [],
};

describe('KroResourceGraph', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApi.getResources.mockResolvedValue(mockResources);
    mockApi.getEvents.mockResolvedValue([]);
    
    const { useEntity } = require('@backstage/plugin-catalog-react');
    useEntity.mockReturnValue({ entity: mockEntity });
    
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: true, loading: false });
  });

  it('should be defined', () => {
    expect(KroResourceGraph).toBeDefined();
  });

  it('should be a function component', () => {
    expect(typeof KroResourceGraph).toBe('function');
  });

  it('should render without crashing', async () => {
    const { container } = render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
      ]}>
        <KroResourceGraph />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });

  it('should call getResources API', async () => {
    render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
      ]}>
        <KroResourceGraph />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(mockApi.getResources).toHaveBeenCalled();
    });
  });

  it('should handle API error gracefully', async () => {
    mockApi.getResources.mockRejectedValue(new Error('API Error'));

    const { container } = render(
      <TestApiProvider apis={[
        [kroApiRef, mockApi],
        [configApiRef, mockConfigApi],
      ]}>
        <KroResourceGraph />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });
});
