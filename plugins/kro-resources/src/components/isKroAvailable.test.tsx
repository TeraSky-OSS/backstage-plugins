import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  isKroAvailable, 
  IfKroOverviewAvailable,
  IfKroResourceGraphAvailable,
  IfKroResourcesListAvailable,
} from './isKroAvailable';
import { Entity } from '@backstage/catalog-model';

// Mock the Backstage APIs
jest.mock('@backstage/core-plugin-api', () => ({
  useApi: jest.fn().mockReturnValue({
    getOptionalBoolean: jest.fn().mockReturnValue(false),
    getOptionalString: jest.fn().mockReturnValue('terasky.backstage.io'),
  }),
  configApiRef: { id: 'config' },
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn().mockReturnValue({ allowed: true, loading: false }),
}));

describe('isKroAvailable', () => {
  it('should return true when entity has KRO annotation', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {
          'terasky.backstage.io/kro-rgd-id': 'rgd-test',
        },
      },
    };

    expect(isKroAvailable(entity)).toBe(true);
  });

  it('should return false when entity has no KRO annotation', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {},
      },
    };

    expect(isKroAvailable(entity)).toBe(false);
  });

  it('should return false when entity has no annotations', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
      },
    };

    expect(isKroAvailable(entity)).toBe(false);
  });
});

describe('IfKroOverviewAvailable', () => {
  beforeEach(() => {
    const { useApi } = require('@backstage/core-plugin-api');
    const { usePermission } = require('@backstage/plugin-permission-react');
    
    useApi.mockReturnValue({
      getOptionalBoolean: jest.fn().mockReturnValue(false),
    });
    usePermission.mockReturnValue({ allowed: true, loading: false });
  });

  it('should render children when permissions disabled', () => {
    render(
      <IfKroOverviewAvailable>
        <div>Overview Content</div>
      </IfKroOverviewAvailable>
    );

    expect(screen.getByText('Overview Content')).toBeInTheDocument();
  });

  it('should render children when permission allowed', () => {
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: true, loading: false });

    render(
      <IfKroOverviewAvailable>
        <div>Overview Content</div>
      </IfKroOverviewAvailable>
    );

    expect(screen.getByText('Overview Content')).toBeInTheDocument();
  });

  it('should not render children when permission denied and permissions enabled', () => {
    const { usePermission } = require('@backstage/plugin-permission-react');
    const { useApi } = require('@backstage/core-plugin-api');
    
    usePermission.mockReturnValue({ allowed: false, loading: false });
    useApi.mockReturnValue({
      getOptionalBoolean: jest.fn().mockReturnValue(true), // permissions enabled
    });

    render(
      <IfKroOverviewAvailable>
        <div>Overview Content</div>
      </IfKroOverviewAvailable>
    );

    expect(screen.queryByText('Overview Content')).not.toBeInTheDocument();
  });
});

describe('IfKroResourceGraphAvailable', () => {
  beforeEach(() => {
    const { useApi } = require('@backstage/core-plugin-api');
    const { usePermission } = require('@backstage/plugin-permission-react');
    
    useApi.mockReturnValue({
      getOptionalBoolean: jest.fn().mockReturnValue(false),
    });
    usePermission.mockReturnValue({ allowed: true, loading: false });
  });

  it('should render children when permissions disabled', () => {
    render(
      <IfKroResourceGraphAvailable>
        <div>Graph Content</div>
      </IfKroResourceGraphAvailable>
    );

    expect(screen.getByText('Graph Content')).toBeInTheDocument();
  });
});

describe('IfKroResourcesListAvailable', () => {
  beforeEach(() => {
    const { useApi } = require('@backstage/core-plugin-api');
    const { usePermission } = require('@backstage/plugin-permission-react');
    
    useApi.mockReturnValue({
      getOptionalBoolean: jest.fn().mockReturnValue(false),
    });
    usePermission.mockReturnValue({ allowed: true, loading: false });
  });

  it('should render children when permissions disabled', () => {
    render(
      <IfKroResourcesListAvailable>
        <div>List Content</div>
      </IfKroResourcesListAvailable>
    );

    expect(screen.getByText('List Content')).toBeInTheDocument();
  });
});
