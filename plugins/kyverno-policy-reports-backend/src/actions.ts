import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { PermissionsService, AuthService } from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { InputError } from '@backstage/errors';
import { showKyvernoReportsPermission, viewPolicyYAMLPermission } from '@terasky/backstage-plugin-kyverno-common';
import { KubernetesService } from './service/KubernetesService';

export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  service: KubernetesService,
  permissions: PermissionsService,
  auth: AuthService
) {
  // Get Policy Reports
  actionsRegistry.register({
    name: 'get_kyverno_policy_reports',
    title: 'Get Kyverno Policy Reports',
    description: 'Returns policy reports for a given entity',
    schema: {
      input: z => z.object({
        entity: z.object({
          metadata: z.object({
            name: z.string().describe('The name of the entity'),
            namespace: z.string().describe('The namespace of the entity'),
          }),
        }).describe('The entity to get policy reports for'),
      }),
      output: z => z.object({
        reports: z.array(z.object({
          metadata: z.object({
            uid: z.string(),
            namespace: z.string(),
          }),
          scope: z.object({
            kind: z.string(),
            name: z.string(),
          }),
          summary: z.object({
            error: z.number(),
            fail: z.number(),
            pass: z.number(),
            skip: z.number(),
            warn: z.number(),
          }),
          results: z.array(z.object({
            category: z.string(),
            message: z.string(),
            policy: z.string(),
            result: z.string(),
            rule: z.string(),
            severity: z.string(),
            timestamp: z.object({
              seconds: z.number(),
            }),
          })).optional(),
          clusterName: z.string(),
        })).describe('List of policy reports'),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        const serviceCredentials = await auth.getOwnServiceCredentials();
        const decision = await permissions.authorize(
          [{ permission: showKyvernoReportsPermission }],
          { credentials: credentials || serviceCredentials }
        );

        if (decision[0].result !== AuthorizeResult.ALLOW) {
          throw new InputError('Access denied. You do not have permission to view Kyverno policy reports.');
        }

        const reports = await service.getPolicyReports({
          entity: {
            metadata: input.entity.metadata,
          },
        });
        return {
          output: {
            reports,
          },
        };
      } catch (error) {
        if (error instanceof InputError) {
          throw error;
        }
        throw new InputError(`Failed to get policy reports: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // Get Policy Details
  actionsRegistry.register({
    name: 'get_kyverno_policy',
    title: 'Get Kyverno Policy',
    description: 'Returns details of a specific Kyverno policy',
    schema: {
      input: z => z.object({
        clusterName: z.string().describe('The name of the cluster'),
        namespace: z.string().optional().describe('The namespace of the policy (optional for cluster-scoped policies)'),
        policyName: z.string().describe('The name of the policy'),
      }),
      output: z => z.object({
        policy: z.object({}).passthrough().describe('The policy details'),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        const serviceCredentials = await auth.getOwnServiceCredentials();
        const decision = await permissions.authorize(
          [{ permission: viewPolicyYAMLPermission }],
          { credentials: credentials || serviceCredentials }
        );

        if (decision[0].result !== AuthorizeResult.ALLOW) {
          throw new InputError('Access denied. You do not have permission to view Kyverno policy YAML.');
        }

        const policy = await service.getPolicy(
          input.clusterName,
          input.namespace,
          input.policyName,
        );
        return {
          output: {
            policy,
          },
        };
      } catch (error) {
        if (error instanceof InputError) {
          throw error;
        }
        throw new InputError(`Failed to get policy details: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // Get Crossplane Policy Reports
  actionsRegistry.register({
    name: 'get_kyverno_crossplane_policy_reports',
    title: 'Get Kyverno Crossplane Policy Reports',
    description: 'Returns policy reports for Crossplane resources (claims and composites) associated with an entity. the annotations MUST be all the annotations of the entity! these can be retrieved via the tool get-catalog-entity',
    schema: {
      input: z => z.object({
        entity: z.object({
          metadata: z.object({
            name: z.string().describe('The name of the entity'),
            namespace: z.string().optional().describe('The namespace of the entity'),
            annotations: z.record(z.string()).describe('All of the Entity annotations from the backstage entity must be sent!'),
          }),
        }).describe('The entity to get Crossplane policy reports for'),
      }),
      output: z => z.object({
        reports: z.array(z.object({
          metadata: z.object({
            uid: z.string(),
            namespace: z.string().optional(),
          }),
          scope: z.object({
            kind: z.string(),
            name: z.string(),
          }),
          summary: z.object({
            error: z.number(),
            fail: z.number(),
            pass: z.number(),
            skip: z.number(),
            warn: z.number(),
          }),
          results: z.array(z.object({
            category: z.string(),
            message: z.string(),
            policy: z.string(),
            result: z.string(),
            rule: z.string(),
            severity: z.string(),
            timestamp: z.object({
              seconds: z.number(),
            }),
          })).optional(),
          clusterName: z.string(),
        })).describe('List of policy reports for Crossplane resources'),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        const serviceCredentials = await auth.getOwnServiceCredentials();
        const decision = await permissions.authorize(
          [{ permission: showKyvernoReportsPermission }],
          { credentials: credentials || serviceCredentials }
        );

        if (decision[0].result !== AuthorizeResult.ALLOW) {
          throw new InputError('Access denied. You do not have permission to view Kyverno policy reports.');
        }

        const reports = await service.getCrossplanePolicyReports({
          entity: {
            metadata: input.entity.metadata,
          },
        });
        return {
          output: {
            reports,
          },
        };
      } catch (error) {
        if (error instanceof InputError) {
          throw error;
        }
        throw new InputError(`Failed to get Crossplane policy reports: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });
}
