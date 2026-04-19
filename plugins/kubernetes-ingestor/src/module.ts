import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  catalogProcessingExtensionPoint,
} from '@backstage/plugin-catalog-node';
import { EventParams, eventsServiceRef } from '@backstage/plugin-events-node';
import { KubernetesEntityProvider, RGDTemplateEntityProvider, XRDTemplateEntityProvider } from './providers';
import { DefaultKubernetesResourceFetcher } from './services';

interface DeltaEventPayload {
  action: 'upsert' | 'delete';
  apiVersion: string;
  kind: string;
  name: string;
  namespace?: string;
  clusterName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDeltaEventPayload(payload: unknown): DeltaEventPayload | undefined {
  if (!isRecord(payload)) return undefined;
  const { action, apiVersion, kind, name, namespace, clusterName } = payload;
  if (action !== 'upsert' && action !== 'delete') return undefined;
  if (typeof apiVersion !== 'string' || apiVersion.length === 0) return undefined;
  if (typeof kind !== 'string' || kind.length === 0) return undefined;
  if (typeof name !== 'string' || name.length === 0) return undefined;
  if (typeof clusterName !== 'string' || clusterName.length === 0) return undefined;
  if (namespace !== undefined && typeof namespace !== 'string') return undefined;
  return {
    action,
    apiVersion,
    kind,
    name,
    namespace: namespace === '' ? undefined : namespace,
    clusterName,
  };
}

export const catalogModuleKubernetesIngestor = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'kubernetes-ingestor',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        discovery: coreServices.discovery,
        scheduler: coreServices.scheduler,
        auth: coreServices.auth,
        urlReader: coreServices.urlReader,
        events: eventsServiceRef,
      },
      async init({
        catalog,
        logger,
        config,
        discovery,
        scheduler,
        auth,
        urlReader,
        events,
      }) {
        const taskRunner = scheduler.createScheduledTaskRunner({
          frequency: {
            seconds: config.getOptionalNumber(
              'kubernetesIngestor.components.taskRunner.frequency',
            ) ?? 600,
          },
          timeout: {
            seconds: config.getOptionalNumber(
              'kubernetesIngestor.components.taskRunner.timeout',
            ) ?? 600,
          },
        });

        const xrdTaskRunner = scheduler.createScheduledTaskRunner({
          frequency: {
            seconds: config.getOptionalNumber(
              'kubernetesIngestor.crossplane.xrds.taskRunner.frequency',
            ) ?? 600,
          },
          timeout: {
            seconds: config.getOptionalNumber(
              'kubernetesIngestor.crossplane.xrds.taskRunner.timeout',
            ) ?? 600,
          },
        });

        const resourceFetcher = new DefaultKubernetesResourceFetcher(discovery, auth);

        const templateEntityProvider = new KubernetesEntityProvider(
          taskRunner,
          logger,
          config,
          resourceFetcher,
          urlReader,
        );

        const xrdTemplateEntityProvider = new XRDTemplateEntityProvider(
          xrdTaskRunner,
          logger,
          config,
          resourceFetcher,
        );

        const rgdTemplateEntityProvider = new RGDTemplateEntityProvider(
          taskRunner,
          logger,
          config,
          resourceFetcher,
        );
        const kroEnabled = config.getOptionalBoolean('kubernetesIngestor.kro.enabled');
        if (kroEnabled === true) {
          const kroRGDEnabled = config.getOptionalBoolean('kubernetesIngestor.kro.rgds.enabled');
          if (kroRGDEnabled === true) {
            await catalog.addEntityProvider(rgdTemplateEntityProvider);
          }
        }
        const xrdEnabled = config.getOptionalBoolean('kubernetesIngestor.crossplane.xrds.enabled');
        await catalog.addEntityProvider(templateEntityProvider);
        // Only disable if explicitly set to false; default is enabled
        if (xrdEnabled !== false) {
          await catalog.addEntityProvider(xrdTemplateEntityProvider);
        }

        // Optional incremental-update subscription. When `kubernetesIngestor.events.topic`
        // is configured, the module subscribes to the topic on the Backstage events bus
        // and applies each event as a delta against the provider, without waiting for
        // the next periodic full sync. Downstream integrations are responsible for
        // publishing events in the documented payload shape.
        const deltaTopic = config.getOptionalString('kubernetesIngestor.events.topic');
        if (deltaTopic) {
          await events.subscribe({
            id: 'kubernetes-ingestor-delta',
            topics: [deltaTopic],
            onEvent: async (params: EventParams) => {
              const deltaEvent = parseDeltaEventPayload(params.eventPayload);
              if (!deltaEvent) {
                logger.debug('Dropping malformed kubernetes-ingestor delta event', {
                  topic: params.topic,
                });
                return;
              }
              try {
                await templateEntityProvider.deltaUpdate(deltaEvent);
              } catch (error) {
                logger.warn('Failed to apply kubernetes-ingestor delta event', {
                  topic: params.topic,
                  clusterName: deltaEvent.clusterName,
                  kind: deltaEvent.kind,
                  name: deltaEvent.name,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            },
          });
          logger.info('Kubernetes ingestor subscribed to delta events', {
            topic: deltaTopic,
          });
        }
      },
    });
  },
});