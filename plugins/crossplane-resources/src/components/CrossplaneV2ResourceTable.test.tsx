import { render } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { configApiRef } from '@backstage/core-plugin-api';
import { MemoryRouter } from 'react-router-dom';
import CrossplaneV2ResourcesTable from './CrossplaneV2ResourceTable';
import { crossplaneApiRef } from '../api/CrossplaneApi';

jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(),
}));

const mockUseEntity = useEntity as jest.MockedFunction<typeof useEntity>;
const mockUsePermission = usePermission as jest.MockedFunction<typeof usePermission>;

describe('CrossplaneV2ResourceTable', () => {
  const mockConfigApi = {
    getOptionalBoolean: jest.fn().mockReturnValue(false),
    getOptionalString: jest.fn().mockReturnValue(undefined),
  };

  const mockCrossplaneApi = {
    getV2Resources: jest.fn().mockResolvedValue({ resources: [], supportingResources: [] }),
    getEvents: jest.fn().mockResolvedValue({ events: [] }),
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
    } as any);

    mockUsePermission.mockReturnValue({
      loading: false,
      allowed: true,
      error: undefined,
    });
  });

  it('should be defined', () => {
    expect(CrossplaneV2ResourcesTable).toBeDefined();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <TestApiProvider apis={[
          [configApiRef, mockConfigApi],
          [crossplaneApiRef, mockCrossplaneApi],
        ]}>
          <CrossplaneV2ResourcesTable />
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
          <CrossplaneV2ResourcesTable />
        </TestApiProvider>
      </MemoryRouter>
    );

    expect(mockCrossplaneApi.getV2Resources).not.toHaveBeenCalled();
  });
});

