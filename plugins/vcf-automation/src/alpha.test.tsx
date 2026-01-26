import { Entity } from '@backstage/catalog-model';

// Replicate the filter functions from alpha.tsx for testing
const isVCFDeployment = (entity: Entity) => {
  return entity.spec?.type === 'vcf-automation-deployment';
};

const isVCFVSphereVM = (entity: Entity) => {
  const typeValue = entity.spec?.type;
  if (typeof typeValue === 'string') {
    return typeValue.toLowerCase() === 'cloud.vsphere.machine';
  }
  return false;
};

const isVCFProject = (entity: Entity) => {
  return entity.spec?.type === 'vcf-automation-project';
};

const isVCFGenericResource = (entity: Entity) => {
  return (entity.metadata.tags?.includes('vcf-automation-resource') && entity.kind === 'Resource') || false;
};

const isVCFCCINamespace = (entity: Entity) => {
  const typeValue = entity.spec?.type;
  if (typeof typeValue === 'string') {
    return typeValue.toLowerCase() === 'cci.supervisor.namespace';
  }
  return false;
};

const isVCFCCIResource = (entity: Entity) => {
  const typeValue = entity.spec?.type;
  if (typeof typeValue === 'string') {
    return typeValue.toLowerCase() === 'cci.supervisor.resource';
  }
  return false;
};

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
        expect(isVCFDeployment(entity)).toBe(true);
      });

      it('should return false for other types', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'other-type' },
        };
        expect(isVCFDeployment(entity)).toBe(false);
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
        expect(isVCFVSphereVM(entity)).toBe(true);
      });

      it('should return true for lowercase cloud.vsphere.machine', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'cloud.vsphere.machine' },
        };
        expect(isVCFVSphereVM(entity)).toBe(true);
      });

      it('should return false for non-string type', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 123 as any },
        };
        expect(isVCFVSphereVM(entity)).toBe(false);
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
        expect(isVCFProject(entity)).toBe(true);
      });

      it('should return false for other types', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'other-type' },
        };
        expect(isVCFProject(entity)).toBe(false);
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
        expect(isVCFGenericResource(entity)).toBe(true);
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
        expect(isVCFGenericResource(entity)).toBe(false);
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
        expect(isVCFGenericResource(entity)).toBe(false);
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
        expect(isVCFCCINamespace(entity)).toBe(true);
      });

      it('should handle uppercase CCI.Supervisor.Namespace', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'CCI.Supervisor.Namespace' },
        };
        expect(isVCFCCINamespace(entity)).toBe(true);
      });

      it('should return false for non-string type', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 123 as any },
        };
        expect(isVCFCCINamespace(entity)).toBe(false);
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
        expect(isVCFCCIResource(entity)).toBe(true);
      });

      it('should return false for non-string type', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 456 as any },
        };
        expect(isVCFCCIResource(entity)).toBe(false);
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

