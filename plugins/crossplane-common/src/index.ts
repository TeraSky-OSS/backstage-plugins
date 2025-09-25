import { createPermission } from '@backstage/plugin-permission-common';
export * from './types';

export const listClaimsPermission = createPermission({
  name: 'crossplane.claims.list',
  attributes: { action: 'read' },
});

export const viewYamlClaimsPermission = createPermission({
  name: 'crossplane.claims.view-yaml',
  attributes: { action: 'read' },
});

export const showEventsClaimsPermission = createPermission({
  name: 'crossplane.claims.show-events',
  attributes: { action: 'read' },
});

export const listCompositeResourcesPermission = createPermission({
  name: 'crossplane.composite-resources.list',
  attributes: { action: 'read' },
});

export const viewYamlCompositeResourcesPermission = createPermission({
  name: 'crossplane.composite-resources.view-yaml',
  attributes: { action: 'read' },
});

export const showEventsCompositeResourcesPermission = createPermission({
  name: 'crossplane.composite-resources.show-events',
  attributes: { action: 'read' },
});

export const listManagedResourcesPermission = createPermission({
  name: 'crossplane.managed-resources.list',
  attributes: { action: 'read' },
});

export const viewYamlManagedResourcesPermission = createPermission({
  name: 'crossplane.managed-resources.view-yaml',
  attributes: { action: 'read' },
});

export const showEventsManagedResourcesPermission = createPermission({
  name: 'crossplane.managed-resources.show-events',
  attributes: { action: 'read' },
});

export const listAdditionalResourcesPermission = createPermission({
  name: 'crossplane.additional-resources.list',
  attributes: { action: 'read' },
});

export const viewYamlAdditionalResourcesPermission = createPermission({
  name: 'crossplane.additional-resources.view-yaml',
  attributes: { action: 'read' },
});

export const showEventsAdditionalResourcesPermission = createPermission({
  name: 'crossplane.additional-resources.show-events',
  attributes: { action: 'read' },
});

export const showResourceGraph = createPermission({
  name: 'crossplane.resource-graph.show',
  attributes: { action: 'read' },
});

export const showOverview = createPermission({
  name: 'crossplane.overview.view',
  attributes: { action: 'read' },
});

export const crossplanePermissions = [showOverview, showEventsAdditionalResourcesPermission, viewYamlAdditionalResourcesPermission, listAdditionalResourcesPermission, showResourceGraph, showEventsManagedResourcesPermission, viewYamlManagedResourcesPermission, listManagedResourcesPermission, showEventsCompositeResourcesPermission, viewYamlCompositeResourcesPermission, listCompositeResourcesPermission, showEventsClaimsPermission, viewYamlClaimsPermission, listClaimsPermission];