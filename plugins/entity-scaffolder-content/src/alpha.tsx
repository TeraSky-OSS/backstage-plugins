import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { ScaffolderFieldExtensions } from '@backstage/plugin-scaffolder-react';
import { EntityPickerFieldExtension, RepoUrlPickerFieldExtension } from '@backstage/plugin-scaffolder';
import { GitOpsManifestUpdaterExtension } from '@terasky/backstage-plugin-gitops-manifest-updater';
import { stringifyEntityRef } from '@backstage/catalog-model';

/** @alpha */
export const entityScaffolderContentExtension = EntityContentBlueprint.make({
  name: 'entity-scaffolder-content',
  params: {
    path: '/scaffolder-content',
    title: 'EntityScaffolder',
    filter: entity => entity.spec?.type === 'kubernetes-namespace',
    loader: () => import('./components/EntityScaffolderContent').then(m => 
      <m.EntityScaffolderContent 
        templateGroupFilters={[
          {
            title: 'Management Templates',
            filter: (entity, template) =>
              template.metadata?.labels?.forEntity === 'system' &&
              entity.spec?.type === 'kubernetes-namespace',
          },
        ]}
        
        buildInitialState={entity => ({
            xrNamespace: entity.metadata.name,
            clusters: [entity.metadata?.annotations?.['backstage.io/managed-by-location']?.split(": ")[1] ?? '']
        })}
        ScaffolderFieldExtensions={
            <ScaffolderFieldExtensions>
              <RepoUrlPickerFieldExtension />
              <EntityPickerFieldExtension />
            </ScaffolderFieldExtensions>
        }
      />
    ),
  },
  disabled: false,
});

/** @alpha */
export const crossplaneEntityScaffolderContentExtension = EntityContentBlueprint.make({
  name: 'entity-scaffolder-content-crossplane',
  params: {
    path: '/crossplane-scaffolder-content',
    title: 'Scaffolder Content',
    filter: entity => entity.spec?.type?.toString().startsWith('crossplane') || false,
    loader: () => import('./components/EntityScaffolderContent').then(m => 
      <m.EntityScaffolderContent 
        templateGroupFilters={[
          {
            title: 'Crossplane Day2 Templates',
            filter: (entity, template) =>
              template.metadata?.labels?.target === 'component' &&
              entity.metadata?.annotations?.['backstage.io/managed-by-location']?.split(":")[0] === 'cluster origin',
          },
        
        ]}
        buildInitialState={entity => ({
            entity: stringifyEntityRef(entity)
          }
        )}
        ScaffolderFieldExtensions={
          <ScaffolderFieldExtensions>
            <RepoUrlPickerFieldExtension />
            <EntityPickerFieldExtension />
            <GitOpsManifestUpdaterExtension />
          </ScaffolderFieldExtensions>
        }
      />
      
    ),
  },
  disabled: false,
});

/** @alpha */
export const entityScaffolderContentPlugin = createFrontendPlugin({
  pluginId: 'entity-scaffolder-content',
  extensions: [entityScaffolderContentExtension, crossplaneEntityScaffolderContentExtension],
});

export default entityScaffolderContentPlugin;