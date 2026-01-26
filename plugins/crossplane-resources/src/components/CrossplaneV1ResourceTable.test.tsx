import React from 'react';
import { render } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { configApiRef } from '@backstage/core-plugin-api';
import { MemoryRouter } from 'react-router-dom';
import CrossplaneResourcesTable from './CrossplaneV1ResourceTable';
import { crossplaneApiRef } from '../api/CrossplaneApi';

jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(),
}));

const mockUseEntity = useEntity as jest.MockedFunction<typeof useEntity>;
const mockUsePermission = usePermission as jest.MockedFunction<typeof usePermission>;

describe('CrossplaneV1ResourceTable', () => {
  const mockConfigApi = {
    getOptionalBoolean: jest.fn().mockReturnValue(false),
    getOptionalString: jest.fn().mockReturnValue(undefined),
  };

  const mockCrossplaneApi = {
    getResources: jest.fn().mockResolvedValue({ resources: [], supportingResources: [] }),
    getEvents: jest.fn().mockResolvedValue({ events: [] }),
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
    expect(CrossplaneResourcesTable).toBeDefined();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <TestApiProvider apis={[
          [configApiRef, mockConfigApi],
          [crossplaneApiRef, mockCrossplaneApi],
        ]}>
          <CrossplaneResourcesTable />
        </TestApiProvider>
      </MemoryRouter>
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
      <MemoryRouter>
        <TestApiProvider apis={[
          [configApiRef, mockConfigApi],
          [crossplaneApiRef, mockCrossplaneApi],
        ]}>
          <CrossplaneResourcesTable />
        </TestApiProvider>
      </MemoryRouter>
    );

    expect(mockCrossplaneApi.getResources).not.toHaveBeenCalled();
  });
});

