import { createPermission } from '@backstage/plugin-permission-common';

export const viewProjectDetailsPermission = createPermission({
  name: 'vcf-automation.project-details.view',
  attributes: { action: 'read' },
});

export const viewDeploymentHistoryPermission = createPermission({
  name: 'vcf-automation.deployments-history.view',
  attributes: { action: 'read' },
});

export const viewDeploymentsUserEventsPermission = createPermission({
  name: 'vcf-automation.deployments-user-events.view',
  attributes: { action: 'read' },
});

export const showDeploymentResourcesDataPermission = createPermission({
  name: 'vcf-automation.resources.view',
  attributes: { action: 'read' },
});


export const vcfAutomationPermissions = [showDeploymentResourcesDataPermission, viewProjectDetailsPermission, viewDeploymentHistoryPermission, viewDeploymentsUserEventsPermission];