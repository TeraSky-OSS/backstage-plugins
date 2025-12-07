import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { PermissionsService, AuthService } from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { InputError } from '@backstage/errors';
import { 
  portalViewPermission,
  workshopStartPermission 
} from '@terasky/backstage-plugin-educates-common';
import { EducatesService } from './service/EducatesService';

export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  service: EducatesService,
  permissions: PermissionsService,
  auth: AuthService
) {
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
    action: async ({ credentials: _credentials }) => {
      try {
        // Note: No specific permission check required for listing portal names
        // Permission checks are enforced when accessing specific portals
        const portals = await service.getTrainingPortals();
        return {
          output: {
            portals,
          },
        };
      } catch (error) {
        throw new InputError(`Failed to get training portals: ${error instanceof Error ? error.message : String(error)}`);
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
    action: async ({ input, credentials }) => {
      try {
        const serviceCredentials = await auth.getOwnServiceCredentials();
        const decision = await permissions.authorize(
          [{ permission: portalViewPermission, resourceRef: input.portalName }],
          { credentials: credentials || serviceCredentials }
        );

        if (decision[0].result !== AuthorizeResult.ALLOW) {
          throw new InputError('Access denied. You do not have permission to view this training portal.');
        }

        const catalog = await service.getWorkshops(input.portalName);
        return {
          output: {
            workshops: catalog.workshops || [],
          },
        };
      } catch (error) {
        if (error instanceof InputError) {
          throw error;
        }
        throw new InputError(`Failed to get workshops: ${error instanceof Error ? error.message : String(error)}`);
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
    action: async ({ input, credentials }) => {
      try {
        const serviceCredentials = await auth.getOwnServiceCredentials();
        
        // First check portal view permission
        const portalDecision = await permissions.authorize(
          [{ permission: portalViewPermission, resourceRef: input.portalName }],
          { credentials: credentials || serviceCredentials }
        );

        if (portalDecision[0].result !== AuthorizeResult.ALLOW) {
          throw new InputError('Access denied. You do not have permission to view this training portal.');
        }

        // Get workshops catalog to find the workshop name for permission checking
        const catalog = await service.getWorkshops(input.portalName);
        const workshop = catalog.workshops?.find((w: any) => w.environment.name === input.workshopEnvName);
        
        if (!workshop) {
          throw new InputError(`Workshop not found with environment name: ${input.workshopEnvName}`);
        }

        // Check permission to start this specific workshop
        const workshopDecision = await permissions.authorize(
          [{ permission: workshopStartPermission, resourceRef: `${input.portalName}:${workshop.name}` }],
          { credentials: credentials || serviceCredentials }
        );

        if (workshopDecision[0].result !== AuthorizeResult.ALLOW) {
          throw new InputError('Access denied. You do not have permission to start this workshop.');
        }

        const session = await service.requestWorkshopSession(
          input.portalName,
          input.workshopEnvName,
        );
        return {
          output: session,
        };
      } catch (error) {
        if (error instanceof InputError) {
          throw error;
        }
        throw new InputError(`Failed to request workshop session: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });
}
