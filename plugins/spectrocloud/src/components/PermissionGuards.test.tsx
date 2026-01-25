import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import {
  getAnnotationPrefix,
  isSpectroCloudCluster,
  isSpectroCloudProfile,
  useCanDownloadKubeconfig,
  useCanViewPackValues,
  useCanViewPackManifests,
  useCanViewClusterInfo,
  useCanViewProfileInfo,
  useCanViewProfileClusters,
  IfCanViewClusterInfo,
  IfCanDownloadKubeconfig,
  IfCanViewPackValues,
  IfCanViewPackManifests,
  IfCanViewProfileInfo,
  IfCanViewProfileClusters,
} from './PermissionGuards';
import { Entity } from '@backstage/catalog-model';
import { ConfigApi } from '@backstage/core-plugin-api';

// Mock the dependencies
jest.mock('@backstage/core-plugin-api', () => ({
  useApi: jest.fn().mockReturnValue({
    getOptionalConfig: jest.fn().mockReturnValue({
      getOptionalBoolean: jest.fn().mockReturnValue(false),
      getOptionalString: jest.fn().mockReturnValue(undefined),
    }),
  }),
  configApiRef: { id: 'config' },
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn().mockReturnValue({ allowed: true, loading: false }),
}));

describe('PermissionGuards', () => {
  describe('getAnnotationPrefix', () => {
    it('should return custom prefix from config', () => {
      const mockConfig = {
        getOptionalConfig: jest.fn().mockReturnValue({
          getOptionalString: jest.fn().mockReturnValue('custom.prefix.io'),
        }),
      } as unknown as ConfigApi;

      expect(getAnnotationPrefix(mockConfig)).toBe('custom.prefix.io');
    });

    it('should return default prefix when config is undefined', () => {
      const mockConfig = {
        getOptionalConfig: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigApi;

      expect(getAnnotationPrefix(mockConfig)).toBe('terasky.backstage.io');
    });
  });

  describe('isSpectroCloudCluster', () => {
    it('should return true when entity has SpectroCloud cluster annotation', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            'terasky.backstage.io/cluster-id': 'cluster-123',
          },
        },
      };
      expect(isSpectroCloudCluster(entity)).toBe(true);
    });

    it('should return false when entity has no SpectroCloud annotation', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {},
        },
      };
      expect(isSpectroCloudCluster(entity)).toBe(false);
    });

    it('should use custom annotation prefix', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            'custom.io/cluster-id': 'cluster-123',
          },
        },
      };
      expect(isSpectroCloudCluster(entity, 'custom.io')).toBe(true);
    });
  });

  describe('isSpectroCloudProfile', () => {
    it('should return true when entity has SpectroCloud profile annotation', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            'terasky.backstage.io/profile-id': 'profile-123',
          },
        },
      };
      expect(isSpectroCloudProfile(entity)).toBe(true);
    });

    it('should return false when entity has no SpectroCloud profile annotation', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {},
        },
      };
      expect(isSpectroCloudProfile(entity)).toBe(false);
    });
  });

  describe('Permission Hooks', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('useCanDownloadKubeconfig', () => {
      it('should be defined', () => {
        expect(useCanDownloadKubeconfig).toBeDefined();
      });
    });

    describe('useCanViewPackValues', () => {
      it('should be defined', () => {
        expect(useCanViewPackValues).toBeDefined();
      });
    });

    describe('useCanViewPackManifests', () => {
      it('should be defined', () => {
        expect(useCanViewPackManifests).toBeDefined();
      });
    });

    describe('useCanViewClusterInfo', () => {
      it('should be defined', () => {
        expect(useCanViewClusterInfo).toBeDefined();
      });
    });

    describe('useCanViewProfileInfo', () => {
      it('should be defined', () => {
        expect(useCanViewProfileInfo).toBeDefined();
      });
    });

    describe('useCanViewProfileClusters', () => {
      it('should be defined', () => {
        expect(useCanViewProfileClusters).toBeDefined();
      });
    });
  });

  describe('Permission Guard Components', () => {
    beforeEach(() => {
      const { useApi } = require('@backstage/core-plugin-api');
      const { usePermission } = require('@backstage/plugin-permission-react');
      
      useApi.mockReturnValue({
        getOptionalConfig: jest.fn().mockReturnValue({
          getOptionalBoolean: jest.fn().mockReturnValue(false),
        }),
      });
      usePermission.mockReturnValue({ allowed: true, loading: false });
    });

    describe('IfCanViewClusterInfo', () => {
      it('should render children when permissions disabled', () => {
        render(
          <IfCanViewClusterInfo>
            <div>Cluster Info</div>
          </IfCanViewClusterInfo>
        );
        expect(screen.getByText('Cluster Info')).toBeInTheDocument();
      });

      it('should render fallback when not allowed and permissions enabled', () => {
        const { useApi } = require('@backstage/core-plugin-api');
        const { usePermission } = require('@backstage/plugin-permission-react');
        
        useApi.mockReturnValue({
          getOptionalConfig: jest.fn().mockReturnValue({
            getOptionalBoolean: jest.fn().mockReturnValue(true),
          }),
        });
        usePermission.mockReturnValue({ allowed: false, loading: false });

        render(
          <IfCanViewClusterInfo fallback={<div>No Access</div>}>
            <div>Cluster Info</div>
          </IfCanViewClusterInfo>
        );
        expect(screen.getByText('No Access')).toBeInTheDocument();
      });
    });

    describe('IfCanDownloadKubeconfig', () => {
      it('should render children when allowed', () => {
        render(
          <IfCanDownloadKubeconfig>
            <div>Download Button</div>
          </IfCanDownloadKubeconfig>
        );
        expect(screen.getByText('Download Button')).toBeInTheDocument();
      });
    });

    describe('IfCanViewPackValues', () => {
      it('should render children when allowed', () => {
        render(
          <IfCanViewPackValues>
            <div>Pack Values</div>
          </IfCanViewPackValues>
        );
        expect(screen.getByText('Pack Values')).toBeInTheDocument();
      });
    });

    describe('IfCanViewPackManifests', () => {
      it('should render children when allowed', () => {
        render(
          <IfCanViewPackManifests>
            <div>Pack Manifests</div>
          </IfCanViewPackManifests>
        );
        expect(screen.getByText('Pack Manifests')).toBeInTheDocument();
      });
    });

    describe('IfCanViewProfileInfo', () => {
      it('should render children when allowed', () => {
        render(
          <IfCanViewProfileInfo>
            <div>Profile Info</div>
          </IfCanViewProfileInfo>
        );
        expect(screen.getByText('Profile Info')).toBeInTheDocument();
      });
    });

    describe('IfCanViewProfileClusters', () => {
      it('should render children when allowed', () => {
        render(
          <IfCanViewProfileClusters>
            <div>Profile Clusters</div>
          </IfCanViewProfileClusters>
        );
        expect(screen.getByText('Profile Clusters')).toBeInTheDocument();
      });
    });

    describe('loading state', () => {
      it('should render nothing while loading', () => {
        const { usePermission } = require('@backstage/plugin-permission-react');
        usePermission.mockReturnValue({ allowed: false, loading: true });

        const { container } = render(
          <IfCanViewClusterInfo>
            <div>Content</div>
          </IfCanViewClusterInfo>
        );
        expect(container.firstChild).toBeNull();
      });
    });
  });
});
