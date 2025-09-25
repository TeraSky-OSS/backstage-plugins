import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { EducatesService } from './service/EducatesService';

export function registerMcpActions(actionsRegistry: typeof actionsRegistryServiceRef.T, service: EducatesService) {
  // Get Training Portals
  actionsRegistry.register({
    name: 'get_educates_training_portals',
    title: 'Get Educates Training Portals',
    description: 'Returns a list of configured Educates training portals',
    schema: {
      input: z => z.object({}),
      output: z => z.object({
        portals: z.array(z.object({
          name: z.string().describe('The name of the training portal'),
          url: z.string().describe('The URL of the training portal'),
        })),
      }),
    },
    action: async () => {
      try {
        const portals = await service.getTrainingPortals();
        return {
          output: {
            portals,
          },
        };
      } catch (error) {
        throw new Error(`Failed to get training portals: ${error}`);
      }
    },
  });

  // Get Workshops
  actionsRegistry.register({
    name: 'get_educates_workshops',
    title: 'Get Educates Workshops',
    description: 'Returns a list of workshops available in a specific training portal',
    schema: {
      input: z => z.object({
        portalName: z.string().describe('The name of the training portal'),
      }),
      output: z => z.object({
        workshops: z.array(z.object({
          name: z.string().describe('The name of the workshop'),
          title: z.string().describe('The title of the workshop'),
          description: z.string().describe('The description of the workshop'),
          vendor: z.string().describe('The vendor of the workshop'),
          authors: z.array(z.string()).describe('The authors of the workshop'),
          difficulty: z.string().describe('The difficulty level of the workshop'),
          duration: z.string().describe('The duration of the workshop'),
          environment: z.object({
            name: z.string().describe('The name of the workshop environment'),
            capacity: z.number().describe('The capacity of the workshop environment'),
            reserved: z.number().describe('The number of reserved sessions'),
            available: z.number().describe('The number of available sessions'),
          }),
        })),
      }),
    },
    action: async ({ input }) => {
      try {
        const catalog = await service.getWorkshops(input.portalName);
        return {
          output: {
            workshops: catalog.workshops || [],
          },
        };
      } catch (error) {
        throw new Error(`Failed to get workshops: ${error}`);
      }
    },
  });

  // Request Workshop Session
  actionsRegistry.register({
    name: 'request_educates_workshop_session',
    title: 'Request Educates Workshop Session',
    description: 'Requests a new workshop session in a specific training portal',
    schema: {
      input: z => z.object({
        portalName: z.string().describe('The name of the training portal'),
        workshopEnvName: z.string().describe('The environment name of the workshop'),
      }),
      output: z => z.object({
        url: z.string().describe('The URL to access the workshop session'),
        session: z.object({
          id: z.string().describe('The ID of the workshop session'),
          name: z.string().describe('The name of the workshop session'),
          namespace: z.string().describe('The namespace of the workshop session'),
          started: z.string().describe('The start time of the workshop session'),
          expires: z.string().describe('The expiration time of the workshop session'),
          workshop: z.object({
            name: z.string().describe('The name of the workshop'),
            title: z.string().describe('The title of the workshop'),
            description: z.string().describe('The description of the workshop'),
          }),
        }),
      }),
    },
    action: async ({ input }) => {
      try {
        const session = await service.requestWorkshopSession(
          input.portalName,
          input.workshopEnvName,
        );
        return {
          output: session,
        };
      } catch (error) {
        throw new Error(`Failed to request workshop session: ${error}`);
      }
    },
  });
}
