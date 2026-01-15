import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { PermissionsService, AuthService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { ConflictError, InputError } from '@backstage/errors';
import {
  listClaimsPermission,
  listCompositeResourcesPermission,
  listManagedResourcesPermission,
  showEventsClaimsPermission,
  showEventsCompositeResourcesPermission,
  showEventsManagedResourcesPermission,
  getAnnotation,
  DEFAULT_ANNOTATION_PREFIX,
} from '@terasky/backstage-plugin-crossplane-common';
import { KubernetesService } from './service/KubernetesService';

interface V2CrossplaneInfo {
  clusterName: string;
  name: string;
  group: string;
  version: string;
  plural: string;
  kind: string;
  scope: 'Namespaced' | 'Cluster';
  namespace: string;
}

interface V1CrossplaneInfo {
  clusterName: string;
  claimName: string;
  namespace: string;
}

type CrossplaneInfo = V1CrossplaneInfo | V2CrossplaneInfo;

async function getEntityAndCrossplaneInfo(
  catalog: CatalogService,
  name: string,
  kind: string = 'component',
  namespace: string = 'default',
  annotationPrefix: string,
  credentials?: any,
): Promise<{ entity: any; crossplaneInfo: CrossplaneInfo }> {
  const filter: Record<string, string> = { 'metadata.name': name };
  filter.kind = kind;
  filter['metadata.namespace'] = namespace;

  const { items } = await catalog.queryEntities(
    { filter },
    { credentials },
  );

  if (items.length === 0) {
    throw new InputError(`No entity found with name "${name}"`);
  }

  if (items.length > 1) {
    throw new ConflictError(
      `Multiple entities found with name "${name}", please provide more specific filters.`,
    );
  }

  const [entity] = items;
  const annotations = entity.metadata.annotations || {};
  const clusterLocation = annotations['backstage.io/managed-by-location'];
  
  if (!clusterLocation) {
    throw new InputError('Entity is missing required annotation: backstage.io/managed-by-location');
  }

  const clusterName = clusterLocation.split(': ')[1];
  const version =
    getAnnotation(annotations, annotationPrefix, 'crossplane-version') || 'v1';
  // Determine mode based on entity kind
  const isV2 = version === 'v2';
  const isV1 = version === 'v1';

  if (!isV1 && !isV2) {
    throw new InputError('Entity must be of type crossplane-xr or crossplane-claim');
  }

  if (isV2) {
    // Extract V2 (composite) annotations
    const name = getAnnotation(annotations, annotationPrefix, 'composite-name');
    const group = getAnnotation(annotations, annotationPrefix, 'composite-group');
    const version = getAnnotation(annotations, annotationPrefix, 'composite-version');
    const plural = getAnnotation(annotations, annotationPrefix, 'composite-plural');
    const kind = getAnnotation(annotations, annotationPrefix, 'composite-kind');
    const scope = getAnnotation(annotations, annotationPrefix, 'crossplane-scope') as
      | 'Namespaced'
      | 'Cluster'
      | undefined;
    const entityNamespace = entity.metadata.namespace || annotations['namespace'] || 'default';

    // Validate required annotations
    const missing: string[] = [];
    if (!name) missing.push(`${annotationPrefix}/composite-name`);
    if (!group) missing.push(`${annotationPrefix}/composite-group`);
    if (!version) missing.push(`${annotationPrefix}/composite-version`);
    if (!plural) missing.push(`${annotationPrefix}/composite-plural`);
    if (!kind) missing.push(`${annotationPrefix}/composite-kind`);
    if (!scope) missing.push(`${annotationPrefix}/crossplane-scope`);

    if (missing.length > 0) {
      throw new InputError(`Entity is missing required annotations: ${missing.join(', ')}`);
    }

    const crossplaneInfo: V2CrossplaneInfo = {
      clusterName,
      name: name!,
      group: group!,
      version: version!,
      plural: plural!,
      kind: kind!,
      scope: scope!,
      namespace: entityNamespace,
    };

    return { entity, crossplaneInfo };
  } else {
    // Extract V1 (claim) annotations
    const claimName = getAnnotation(annotations, annotationPrefix, 'claim-name');
    if (!claimName) {
      throw new InputError(
        `Entity is missing required annotation: ${annotationPrefix}/claim-name`,
      );
    }

    const crossplaneInfo = {
      clusterName,
      claimName,
      namespace: entity.metadata.namespace || annotations['namespace'] || 'default',
    };

    return { entity, crossplaneInfo };
  }
}

export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  service: KubernetesService,
  catalog: CatalogService,
  permissions: PermissionsService,
  auth: AuthService,
  config: Config,
) {
  const annotationPrefix =
    config.getOptionalString('kubernetesIngestor.annotationPrefix') ||
    DEFAULT_ANNOTATION_PREFIX;
  // Get Crossplane Resources
  actionsRegistry.register({
    name: 'get_crossplane_resources',
    title: 'Get Crossplane Resources',
    description: 'Returns Crossplane resources and their dependencies',
    schema: {
      input: z => z.object({
        backstageEntityName: z.string().describe('The name of the Backstage entity'),
        backstageEntityKind: z.string().describe('The kind of the Backstage entity. Defaults to component.').optional(),
        backstageEntityNamespace: z.string().describe('The namespace of the Backstage entity. Defaults to default.').optional(),
      }),
      output: z => z.object({
        resources: z.array(z.object({
          type: z.enum(['XRD', 'Claim', 'Resource']).describe('The type of the resource'),
          name: z.string().describe('The name of the resource'),
          namespace: z.string().optional().describe('The namespace of the resource'),
          group: z.string().describe('The API group of the resource'),
          kind: z.string().describe('The kind of the resource'),
          status: z.object({
            synced: z.boolean().describe('Whether the resource is synced'),
            ready: z.boolean().describe('Whether the resource is ready'),
            conditions: z.array(z.object({}).passthrough()).describe('The resource conditions'),
          }),
          createdAt: z.string().describe('When the resource was created'),
          resource: z.object({}).passthrough().describe('The full resource object'),
          level: z.number().describe('The level in the resource hierarchy'),
          parentId: z.string().optional().describe('The ID of the parent resource'),
        })),
        supportingResources: z.array(z.object({}).passthrough()).describe('Additional supporting resources'),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        const serviceCredentials = await auth.getOwnServiceCredentials();
        const authorized = await permissions.authorize(
          [
            { permission: listClaimsPermission },
            { permission: listCompositeResourcesPermission },
            { permission: listManagedResourcesPermission },
          ],
          { credentials: credentials || serviceCredentials }
        );

        if (authorized.every(a => a.result !== AuthorizeResult.ALLOW)) {
          throw new InputError('Access denied. You do not have permission to list Crossplane resources.');
        }

        const { items } = await catalog.queryEntities(
          { filter: { 'metadata.name': input.backstageEntityName } },
          { credentials },
        );
        if (!items.length) throw new InputError('Entity not found');
        const entity = items[0];
        const annotations = entity.metadata.annotations || {};
        const clusterName = annotations['backstage.io/managed-by-location'].split(': ')[1];
        const version = getAnnotation(annotations, annotationPrefix, 'crossplane-version') || 'v1';
        let result;
        if (version === 'v2') {
          const scope =
            getAnnotation(annotations, annotationPrefix, 'crossplane-scope') ||
            'Namespaced';
          const compositeGroup = getAnnotation(annotations, annotationPrefix, 'composite-group');
          const compositeVersion = getAnnotation(annotations, annotationPrefix, 'composite-version');
          const compositePlural = getAnnotation(annotations, annotationPrefix, 'composite-plural');
          const compositeName = getAnnotation(annotations, annotationPrefix, 'composite-name');

          if (!compositeGroup || !compositeVersion || !compositePlural || !compositeName) {
            throw new InputError('Entity is missing required composite annotations');
          }

          if (scope === 'Namespaced') {
            result = await service.getResources({
              clusterName,
              namespace: entity.metadata.namespace || 'default',
              group: compositeGroup,
              version: compositeVersion,
              plural: compositePlural,
              name: compositeName,
            });
          } else {
            result = await service.getResources({
              clusterName,
              name: compositeName,
              group: compositeGroup,
              version: compositeVersion,
              plural: compositePlural,
            });
          }
        } else {
          const claimName = getAnnotation(annotations, annotationPrefix, 'claim-name');
          const claimGroup = getAnnotation(annotations, annotationPrefix, 'claim-group');
          const claimVersion = getAnnotation(annotations, annotationPrefix, 'claim-version');
          const claimPlural = getAnnotation(annotations, annotationPrefix, 'claim-plural');

          if (!claimName || !claimGroup || !claimVersion || !claimPlural) {
            throw new InputError('Entity is missing required claim annotations');
          }

          result = await service.getResources({
            clusterName,
            namespace: entity.metadata.namespace || 'default',
            name: claimName,
            group: claimGroup,
            version: claimVersion,
            plural: claimPlural,
          });
        }

        const plainResult = JSON.parse(JSON.stringify(result));
        return {
          output: plainResult,
        };
      } catch (error) {
        if (error instanceof InputError || error instanceof ConflictError) {
          throw error;
        }
        throw new InputError(`Failed to get Crossplane resources: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // Get Crossplane Events
  actionsRegistry.register({
    name: 'get_crossplane_events',
    title: 'Get Crossplane Events',
    description: 'Returns events for a specific Crossplane resource',
    schema: {
      input: z => z.object({
        backstageEntityName: z.string().describe('The name of the Backstage entity'),
        backstageEntityKind: z.string().describe('The kind of the Backstage entity. Defaults to component.').optional(),
        backstageEntityNamespace: z.string().describe('The namespace of the Backstage entity. Defaults to default.').optional(),
        kubernetesNamespace: z.string().describe('The namespace of the Kubernetes resource'),
        kubernetesResourceName: z.string().describe('The name of the Kubernetes resource'),
        kubernetesResourceKind: z.string().describe('The kind of the Kubernetes resource'),
      }),
      output: z => z.object({
        events: z.array(z.object({
          metadata: z.object({
            name: z.string().optional().describe('The name of the event'),
            namespace: z.string().optional().describe('The namespace of the event'),
            creationTimestamp: z.string().optional().describe('When the event was created'),
          }),
          involvedObject: z.object({
            kind: z.string().optional().describe('The kind of the involved object'),
            name: z.string().optional().describe('The name of the involved object'),
            namespace: z.string().optional().describe('The namespace of the involved object'),
          }),
          reason: z.string().optional().describe('The reason for the event'),
          message: z.string().optional().describe('The event message'),
          type: z.string().optional().describe('The event type'),
          firstTimestamp: z.string().optional().describe('When the event first occurred'),
          lastTimestamp: z.string().optional().describe('When the event last occurred'),
          count: z.number().optional().describe('How many times the event occurred'),
        })),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        const serviceCredentials = await auth.getOwnServiceCredentials();
        const authorized = await permissions.authorize(
          [
            { permission: showEventsClaimsPermission },
            { permission: showEventsCompositeResourcesPermission },
            { permission: showEventsManagedResourcesPermission },
          ],
          { credentials: credentials || serviceCredentials }
        );

        if (authorized.every(a => a.result !== AuthorizeResult.ALLOW)) {
          throw new InputError('Access denied. You do not have permission to view Crossplane events.');
        }

        const { crossplaneInfo } = await getEntityAndCrossplaneInfo(
          catalog,
          input.backstageEntityName,
          input.backstageEntityKind,
          input.backstageEntityNamespace,
          annotationPrefix,
          credentials
        );

        const result = await service.getEvents({
          clusterName: crossplaneInfo.clusterName,
          namespace: input.kubernetesNamespace,
          resourceName: input.kubernetesResourceName,
          resourceKind: input.kubernetesResourceKind,
        });
        
        // Convert events to plain objects and ensure required fields are present
        const plainResult = JSON.parse(JSON.stringify(result));
        return {
          output: plainResult,
        };
      } catch (error) {
        if (error instanceof InputError || error instanceof ConflictError) {
          throw error;
        }
        throw new InputError(`Failed to get Crossplane events: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // Get Crossplane Resource Graph (V1)
  actionsRegistry.register({
    name: 'get_crossplane_resource_graph',
    title: 'Get Crossplane Resource Graph',
    description: 'Returns a graph of related Crossplane resources (V1 API)',
    schema: {
      input: z => z.object({
        backstageEntityName: z.string().describe('The name of the Backstage entity'),
        backstageEntityKind: z.string().describe('The kind of the Backstage entity. Defaults to component.').optional(),
        backstageEntityNamespace: z.string().describe('The namespace of the Backstage entity. Defaults to default.').optional(),
      }),
      output: z => z.object({
        resources: z.array(z.object({}).passthrough()).describe('The resources in the graph'),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        const serviceCredentials = await auth.getOwnServiceCredentials();
        const authorized = await permissions.authorize(
          [
            { permission: listCompositeResourcesPermission },
            { permission: listManagedResourcesPermission },
          ],
          { credentials: credentials || serviceCredentials }
        );

        if (authorized.every(a => a.result !== AuthorizeResult.ALLOW)) {
          throw new InputError('Access denied. You do not have permission to view Crossplane resource graph.');
        }

        const { items } = await catalog.queryEntities(
          { filter: { 'metadata.name': input.backstageEntityName } },
          { credentials },
        );
        if (!items.length) throw new InputError('Entity not found');
        const entity = items[0];
        const annotations = entity.metadata.annotations || {};
        const clusterName = annotations['backstage.io/managed-by-location'].split(': ')[1];
        const version =
          getAnnotation(annotations, annotationPrefix, 'crossplane-version') ||
          'v1';
        const namespace = entity.metadata.namespace || 'default';

        let result;
        if (version === 'v2') {
          const compositeName = getAnnotation(annotations, annotationPrefix, 'composite-name');
          const compositeGroup = getAnnotation(annotations, annotationPrefix, 'composite-group');
          const compositeVersion = getAnnotation(annotations, annotationPrefix, 'composite-version');
          const compositePlural = getAnnotation(annotations, annotationPrefix, 'composite-plural');
          const scope = (getAnnotation(annotations, annotationPrefix, 'crossplane-scope') || 'Namespaced') as 'Namespaced' | 'Cluster';

          if (!compositeName || !compositeGroup || !compositeVersion || !compositePlural) {
            throw new InputError('Entity is missing required composite annotations');
          }

          result = await service.getV2ResourceGraph({
            clusterName,
            namespace,
            name: compositeName,
            group: compositeGroup,
            version: compositeVersion,
            plural: compositePlural,
            scope,
          });
        } else {
          const claimName = getAnnotation(annotations, annotationPrefix, 'claim-name');
          const claimGroup = getAnnotation(annotations, annotationPrefix, 'claim-group');
          const claimVersion = getAnnotation(annotations, annotationPrefix, 'claim-version');
          const claimPlural = getAnnotation(annotations, annotationPrefix, 'claim-plural');

          if (!claimName || !claimGroup || !claimVersion || !claimPlural) {
            throw new InputError('Entity is missing required claim annotations');
          }

          result = await service.getResourceGraph({
            clusterName,
            namespace,
            xrdName: claimName,
            xrdId: claimName,
            claimId: claimName,
            claimName,
            claimGroup,
            claimVersion,
            claimPlural,
          });
        }

        const plainResult = JSON.parse(JSON.stringify(result));
        return {
          output: plainResult,
        };
      } catch (error) {
        if (error instanceof InputError || error instanceof ConflictError) {
          throw error;
        }
        throw new InputError(`Failed to get Crossplane resource graph: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

}
