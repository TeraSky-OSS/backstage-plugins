import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import KroOverviewCard from './KroOverviewCard';
import { TestApiProvider } from '@backstage/test-utils';
import { configApiRef } from '@backstage/core-plugin-api';
import { kroApiRef } from '../api/KroApi';
import { EntityProvider } from '@backstage/plugin-catalog-react';

// Mock the permission hook
jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn().mockReturnValue({ allowed: true, loading: false }),
}));

// Mock Material-UI styles
jest.mock('@material-ui/core/styles', () => ({
  ...jest.requireActual('@material-ui/core/styles'),
  makeStyles: () => () => ({
    button: 'button',
    customWidth: 'customWidth',
    noMaxWidth: 'noMaxWidth',
  }),
}));

const mockEntity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'test-kro-instance',
    namespace: 'default',
    annotations: {
      'backstage.io/managed-by-location': 'cluster: test-cluster',
      'terasky.backstage.io/kro-rgd-name': 'test-rgd',
      'terasky.backstage.io/kro-rgd-id': 'rgd-123',
      'terasky.backstage.io/kro-instance-name': 'test-instance',
      'terasky.backstage.io/kro-instance-namespace': 'kro-namespace',
      'terasky.backstage.io/kro-instance-uid': 'instance-uid-123',
      'terasky.backstage.io/kro-rgd-crd-name': 'testresources.kro.run',
    },
  },
  spec: {
    type: 'kro-instance',
  },
};

const mockKroApi = {
  getResources: jest.fn().mockResolvedValue({
    resources: [
      {
        type: 'Instance',
        resource: {
          metadata: { name: 'test-instance' },
          status: {
            conditions: [
              {
                type: 'InstanceSynced',
                status: 'True',
                reason: 'Ready',
                message: 'Instance is synced',
                lastTransitionTime: '2024-01-01T00:00:00Z',
              },
            ],
          },
        },
      },
    ],
    supportingResources: [
      {
        kind: 'ResourceGraphDefinition',
        apiVersion: 'kro.run/v1alpha1',
        metadata: { name: 'test-rgd' },
        status: {
          conditions: [
            {
              type: 'Ready',
              status: 'True',
              reason: 'Ready',
              message: 'RGD is ready',
              lastTransitionTime: '2024-01-01T00:00:00Z',
            },
          ],
        },
      },
    ],
  }),
};

const mockConfig = {
  getOptionalBoolean: jest.fn().mockReturnValue(false),
};

describe('KroOverviewCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (entity = mockEntity) => {
    return render(
      <TestApiProvider
        apis={[
          [configApiRef, mockConfig],
          [kroApiRef, mockKroApi],
        ]}
      >
        <EntityProvider entity={entity}>
          <KroOverviewCard />
        </EntityProvider>
      </TestApiProvider>
    );
  };

  it('should render the card title', async () => {
    renderComponent();
    expect(screen.getByText('KRO Overview')).toBeInTheDocument();
  });

  it('should show loading initially', async () => {
    renderComponent();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display RGD data after loading', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('test-rgd')).toBeInTheDocument();
    });
  });

  it('should display instance name', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('test-instance')).toBeInTheDocument();
    });
  });

  it('should display namespace', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('kro-namespace')).toBeInTheDocument();
    });
  });

  it('should display cluster name', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('test-cluster')).toBeInTheDocument();
    });
  });

  it('should show permission denied message when not allowed', async () => {
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: false, loading: false });
    mockConfig.getOptionalBoolean.mockReturnValue(true);
    
    renderComponent();
    
    expect(screen.getByText(/don't have permissions/)).toBeInTheDocument();
  });

  it('should not fetch resources when permission is denied', async () => {
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: false, loading: false });
    mockConfig.getOptionalBoolean.mockReturnValue(true);
    
    renderComponent();
    
    expect(mockKroApi.getResources).not.toHaveBeenCalled();
  });

  it('should handle missing annotations gracefully', async () => {
    const entityNoAnnotations = {
      ...mockEntity,
      metadata: { name: 'test', annotations: {} },
    };
    
    renderComponent(entityNoAnnotations);
    
    // Should render without crashing
    expect(screen.getByText('KRO Overview')).toBeInTheDocument();
  });
});

