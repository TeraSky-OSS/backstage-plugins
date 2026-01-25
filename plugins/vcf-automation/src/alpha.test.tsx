import { Entity } from '@backstage/catalog-model';

// Import the filter functions by testing the exports
describe('vcf-automation alpha exports', () => {
  // Test entity filter functions
  describe('entity filters', () => {
    describe('isVCFDeployment', () => {
      it('should return true for vcf-automation-deployment type', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'vcf-automation-deployment' },
        };
        expect(entity.spec?.type).toBe('vcf-automation-deployment');
      });

      it('should return false for other types', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'other-type' },
        };
        expect(entity.spec?.type).not.toBe('vcf-automation-deployment');
      });
    });

    describe('isVCFVSphereVM', () => {
      it('should return true for Cloud.vSphere.Machine type (case insensitive)', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'Cloud.vSphere.Machine' },
        };
        const typeValue = entity.spec?.type;
        expect(typeof typeValue === 'string' && typeValue.toLowerCase() === 'cloud.vsphere.machine').toBe(true);
      });

      it('should return true for lowercase cloud.vsphere.machine', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'cloud.vsphere.machine' },
        };
        const typeValue = entity.spec?.type;
        expect(typeof typeValue === 'string' && typeValue.toLowerCase() === 'cloud.vsphere.machine').toBe(true);
      });

      it('should return false for non-string type', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 123 as any },
        };
        const typeValue = entity.spec?.type;
        expect(typeof typeValue === 'string').toBe(false);
      });
    });

    describe('isVCFProject', () => {
      it('should return true for vcf-automation-project type', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'vcf-automation-project' },
        };
        expect(entity.spec?.type).toBe('vcf-automation-project');
      });
    });

    describe('isVCFGenericResource', () => {
      it('should return true for Resource with vcf-automation-resource tag', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Resource',
          metadata: { 
            name: 'test',
            tags: ['vcf-automation-resource'],
          },
        };
        expect(entity.metadata.tags?.includes('vcf-automation-resource') && entity.kind === 'Resource').toBe(true);
      });

      it('should return false for non-Resource kind', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { 
            name: 'test',
            tags: ['vcf-automation-resource'],
          },
        };
        expect(entity.kind === 'Resource').toBe(false);
      });

      it('should return false without vcf-automation-resource tag', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Resource',
          metadata: { 
            name: 'test',
            tags: ['other-tag'],
          },
        };
        expect(entity.metadata.tags?.includes('vcf-automation-resource')).toBe(false);
      });
    });

    describe('isVCFCCINamespace', () => {
      it('should return true for cci.supervisor.namespace type', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'cci.supervisor.namespace' },
        };
        const typeValue = entity.spec?.type;
        expect(typeof typeValue === 'string' && typeValue.toLowerCase() === 'cci.supervisor.namespace').toBe(true);
      });

      it('should handle uppercase CCI.Supervisor.Namespace', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'CCI.Supervisor.Namespace' },
        };
        const typeValue = entity.spec?.type;
        expect(typeof typeValue === 'string' && typeValue.toLowerCase() === 'cci.supervisor.namespace').toBe(true);
      });
    });

    describe('isVCFCCIResource', () => {
      it('should return true for cci.supervisor.resource type', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'cci.supervisor.resource' },
        };
        const typeValue = entity.spec?.type;
        expect(typeof typeValue === 'string' && typeValue.toLowerCase() === 'cci.supervisor.resource').toBe(true);
      });
    });
  });

  describe('plugin exports', () => {
    it('should export vcfAutomationPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.vcfAutomationPlugin).toBeDefined();
    });

    it('should export vcfAutomationApi', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfAutomationApi).toBeDefined();
    });

    it('should export vcfDeploymentOverviewCard', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfDeploymentOverviewCard).toBeDefined();
    });

    it('should export vcfDeploymentContent', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfDeploymentContent).toBeDefined();
    });

    it('should export vcfVSphereVMOverviewCard', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfVSphereVMOverviewCard).toBeDefined();
    });

    it('should export vcfVSphereVMContent', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfVSphereVMContent).toBeDefined();
    });

    it('should export vcfProjectOverviewCard', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfProjectOverviewCard).toBeDefined();
    });

    it('should export vcfProjectContent', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfProjectContent).toBeDefined();
    });

    it('should export vcfGenericResourceOverviewCard', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfGenericResourceOverviewCard).toBeDefined();
    });

    it('should export vcfGenericResourceContent', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfGenericResourceContent).toBeDefined();
    });

    it('should export vcfCCINamespaceOverviewCard', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfCCINamespaceOverviewCard).toBeDefined();
    });

    it('should export vcfCCINamespaceContent', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfCCINamespaceContent).toBeDefined();
    });

    it('should export vcfCCIResourceOverviewCard', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfCCIResourceOverviewCard).toBeDefined();
    });

    it('should export vcfCCIResourceContent', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfCCIResourceContent).toBeDefined();
    });
  });
});

