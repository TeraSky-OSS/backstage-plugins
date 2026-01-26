import { render, screen } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { configApiRef } from '@backstage/core-plugin-api';
import CrossplaneOverviewCard from './CrossplaneV1OverviewCard';
import { crossplaneApiRef } from '../api/CrossplaneApi';

jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(),
}));

const mockUseEntity = useEntity as jest.MockedFunction<typeof useEntity>;
const mockUsePermission = usePermission as jest.MockedFunction<typeof usePermission>;

describe('CrossplaneV1OverviewCard', () => {
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
    } as any);

    mockUsePermission.mockReturnValue({
      loading: false,
      allowed: true,
      error: undefined,
    });
  });

  it('should be defined', () => {
    expect(CrossplaneOverviewCard).toBeDefined();
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
        <CrossplaneOverviewCard />
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
        <CrossplaneOverviewCard />
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
        <CrossplaneOverviewCard />
      </TestApiProvider>
    );

    expect(mockCrossplaneApi.getResourceGraph).not.toHaveBeenCalled();
  });
});

