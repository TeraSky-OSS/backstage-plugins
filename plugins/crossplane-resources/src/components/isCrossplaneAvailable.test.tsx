import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  isCrossplaneAvailable, 
  IfCrossplaneOverviewAvailable,
  IfCrossplaneResourceGraphAvailable,
  IfCrossplaneResourcesListAvailable,
} from './isCrossplaneAvailable';
import { Entity } from '@backstage/catalog-model';

// Mock the Backstage APIs
jest.mock('@backstage/core-plugin-api', () => ({
  useApi: jest.fn().mockReturnValue({
    getOptionalBoolean: jest.fn().mockReturnValue(false),
    getOptionalString: jest.fn().mockReturnValue('crossplane.io'),
  }),
  configApiRef: { id: 'config' },
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn().mockReturnValue({ allowed: true, loading: false }),
}));

describe('isCrossplaneAvailable', () => {
  it('should return true when entity has crossplane annotation', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {
          'crossplane.io/composite-resource': 'xrd-test',
        },
      },
    };

    expect(isCrossplaneAvailable(entity, 'crossplane.io')).toBe(true);
  });

  it('should return false when entity has no crossplane annotation', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {},
      },
    };

    expect(isCrossplaneAvailable(entity, 'crossplane.io')).toBe(false);
  });

  it('should return false when entity has no annotations', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
      },
    };

    expect(isCrossplaneAvailable(entity)).toBe(false);
  });

  it('should use default annotation prefix when not provided', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {
          'terasky.backstage.io/composite-resource': 'xrd-test',
        },
      },
    };

    expect(isCrossplaneAvailable(entity)).toBe(true);
  });
});

describe('IfCrossplaneOverviewAvailable', () => {
  it('should render children when permissions disabled', () => {
    render(
      <IfCrossplaneOverviewAvailable>
        <div>Test Content</div>
      </IfCrossplaneOverviewAvailable>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render children when permission allowed', () => {
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: true, loading: false });

    render(
      <IfCrossplaneOverviewAvailable>
        <div>Test Content</div>
      </IfCrossplaneOverviewAvailable>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should not render children when permission denied and permissions enabled', () => {
    const { usePermission } = require('@backstage/plugin-permission-react');
    const { useApi } = require('@backstage/core-plugin-api');
    
    usePermission.mockReturnValue({ allowed: false, loading: false });
    useApi.mockReturnValue({
      getOptionalBoolean: jest.fn().mockReturnValue(true), // permissions enabled
      getOptionalString: jest.fn().mockReturnValue('crossplane.io'),
    });

    render(
      <IfCrossplaneOverviewAvailable>
        <div>Test Content</div>
      </IfCrossplaneOverviewAvailable>
    );

    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });
});

describe('IfCrossplaneResourceGraphAvailable', () => {
  beforeEach(() => {
    const { useApi } = require('@backstage/core-plugin-api');
    const { usePermission } = require('@backstage/plugin-permission-react');
    
    useApi.mockReturnValue({
      getOptionalBoolean: jest.fn().mockReturnValue(false),
      getOptionalString: jest.fn().mockReturnValue('crossplane.io'),
    });
    usePermission.mockReturnValue({ allowed: true, loading: false });
  });

  it('should render children when permissions disabled', () => {
    render(
      <IfCrossplaneResourceGraphAvailable>
        <div>Graph Content</div>
      </IfCrossplaneResourceGraphAvailable>
    );

    expect(screen.getByText('Graph Content')).toBeInTheDocument();
  });
});

describe('IfCrossplaneResourcesListAvailable', () => {
  beforeEach(() => {
    const { useApi } = require('@backstage/core-plugin-api');
    const { usePermission } = require('@backstage/plugin-permission-react');
    
    useApi.mockReturnValue({
      getOptionalBoolean: jest.fn().mockReturnValue(false),
      getOptionalString: jest.fn().mockReturnValue('crossplane.io'),
    });
    usePermission.mockReturnValue({ allowed: true, loading: false });
  });

  it('should render children when permissions disabled', () => {
    render(
      <IfCrossplaneResourcesListAvailable>
        <div>List Content</div>
      </IfCrossplaneResourcesListAvailable>
    );

    expect(screen.getByText('List Content')).toBeInTheDocument();
  });
});

