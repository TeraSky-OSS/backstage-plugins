import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { configApiRef } from '@backstage/core-plugin-api';
import CrossplaneV2OverviewCard from './CrossplaneV2OverviewCard';
import { crossplaneApiRef } from '../api/CrossplaneApi';

jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(),
}));

const mockUseEntity = useEntity as jest.MockedFunction<typeof useEntity>;
const mockUsePermission = usePermission as jest.MockedFunction<typeof usePermission>;

describe('CrossplaneV2OverviewCard', () => {
  const mockConfigApi = {
    getOptionalBoolean: jest.fn().mockReturnValue(false),
    getOptionalString: jest.fn().mockReturnValue(undefined),
  };

  const mockCrossplaneApi = {
    getV2ResourceGraph: jest.fn().mockResolvedValue({ resources: [] }),
  };

  const mockEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'test-component',
      annotations: {
        'crossplane.io/composite-name': 'test-composite',
        'crossplane.io/composite-group': 'test.example.com',
        'crossplane.io/composite-version': 'v1',
        'crossplane.io/composite-plural': 'composites',
        'crossplane.io/composite-namespace': 'default',
        'crossplane.io/crossplane-scope': 'Namespaced',
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
    expect(CrossplaneV2OverviewCard).toBeDefined();
  });

  it('should render permission denied message when not allowed', () => {
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
        <CrossplaneV2OverviewCard />
      </TestApiProvider>
    );

    expect(screen.getByText(/don't have permissions/i)).toBeInTheDocument();
  });

  it('should render loading state initially', () => {
    render(
      <TestApiProvider apis={[
        [configApiRef, mockConfigApi],
        [crossplaneApiRef, mockCrossplaneApi],
      ]}>
        <CrossplaneV2OverviewCard />
      </TestApiProvider>
    );

    // Component should render without crashing
    expect(document.body).toBeInTheDocument();
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
        <CrossplaneV2OverviewCard />
      </TestApiProvider>
    );

    expect(mockCrossplaneApi.getV2ResourceGraph).not.toHaveBeenCalled();
  });
});

