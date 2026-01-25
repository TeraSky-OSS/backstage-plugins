import React from 'react';
import { render } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { configApiRef } from '@backstage/core-plugin-api';
import CrossplaneResourceGraph from './CrossplaneV1ResourceGraph';
import { crossplaneApiRef } from '../api/CrossplaneApi';

jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(),
}));

jest.mock('reactflow', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  default: () => <div data-testid="react-flow" />,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  useReactFlow: () => ({ fitView: jest.fn() }),
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
  MarkerType: { ArrowClosed: 'arrowclosed' },
}));

const mockUseEntity = useEntity as jest.MockedFunction<typeof useEntity>;
const mockUsePermission = usePermission as jest.MockedFunction<typeof usePermission>;

describe('CrossplaneV1ResourceGraph', () => {
  const mockConfigApi = {
    getOptionalBoolean: jest.fn().mockReturnValue(false),
    getOptionalString: jest.fn().mockReturnValue(undefined),
  };

  const mockCrossplaneApi = {
    getResourceGraph: jest.fn().mockResolvedValue({ resources: [] }),
  };

  const mockEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'test-component',
      annotations: {
        'crossplane.io/claim-name': 'test-claim',
        'crossplane.io/claim-group': 'test.example.com',
        'crossplane.io/claim-version': 'v1',
        'crossplane.io/claim-plural': 'testclaims',
        'backstage.io/kubernetes-label-selector': 'crossplane.io/claim-namespace=default',
        'backstage.io/managed-by-location': 'url: test-cluster',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseEntity.mockReturnValue({
      entity: mockEntity,
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    mockUsePermission.mockReturnValue({
      loading: false,
      allowed: true,
      error: undefined,
    });
  });

  it('should be defined', () => {
    expect(CrossplaneResourceGraph).toBeDefined();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <TestApiProvider apis={[
        [configApiRef, mockConfigApi],
        [crossplaneApiRef, mockCrossplaneApi],
      ]}>
        <CrossplaneResourceGraph />
      </TestApiProvider>
    );

    expect(container).toBeInTheDocument();
  });

  it('should not fetch when permission denied', () => {
    mockUsePermission.mockReturnValue({
      loading: false,
      allowed: false,
      error: undefined,
    });

    mockConfigApi.getOptionalBoolean.mockReturnValue(true);

    render(
      <TestApiProvider apis={[
        [configApiRef, mockConfigApi],
        [crossplaneApiRef, mockCrossplaneApi],
      ]}>
        <CrossplaneResourceGraph />
      </TestApiProvider>
    );

    expect(mockCrossplaneApi.getResourceGraph).not.toHaveBeenCalled();
  });
});

