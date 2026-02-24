import {
  createFrontendPlugin,
  ApiBlueprint,
  type ExtensionDefinition,
  type FrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { Entity } from '@backstage/catalog-model';
import { vcfOperationsApiRef, VcfOperationsClient } from './api/VcfOperationsClient';
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';

const isVCFOperationsAvailable = (entity: Entity) => {
  return Boolean(
    entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-type']
  );
};

/** @alpha */
export const vcfOperationsApi: ExtensionDefinition = ApiBlueprint.make({
  name: 'vcfOperationsApi',
  params: defineParams => defineParams({
    api: vcfOperationsApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      fetchApi: fetchApiRef,
    },
    factory: ({ discoveryApi, fetchApi }) => new VcfOperationsClient({ discoveryApi, fetchApi }),
  }),
  disabled: false,
});

/** @alpha */
export const vcfOperationsContent: ExtensionDefinition =
  EntityContentBlueprint.make({
  name: 'vcf-operations.content',
  params: {
    path: '/vcf-operations',
    title: 'VCF Operations',
    filter: isVCFOperationsAvailable,
    loader: () => import('./components/VCFOperationsExplorer').then(m => <m.VCFOperationsExplorer />),
  },
  disabled: false,
});

/** @alpha */
export const vcfOperationsPlugin: FrontendPlugin =
  createFrontendPlugin({
  pluginId: 'vcf-operations',
  extensions: [vcfOperationsApi, vcfOperationsContent],
});

export default vcfOperationsPlugin;