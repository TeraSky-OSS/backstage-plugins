import { createPermission } from '@backstage/plugin-permission-common';

export const listInstancesPermission = createPermission({
  name: 'kro.instances.list',
  attributes: { action: 'read' },
});

export const viewYamlInstancesPermission = createPermission({
  name: 'kro.instances.view-yaml',
  attributes: { action: 'read' },
});

export const showEventsInstancesPermission = createPermission({
  name: 'kro.instances.show-events',
  attributes: { action: 'read' },
});

export const listRGDsPermission = createPermission({
  name: 'kro.rgds.list',
  attributes: { action: 'read' },
});

export const viewYamlRGDsPermission = createPermission({
  name: 'kro.rgds.view-yaml',
  attributes: { action: 'read' },
});

export const showEventsRGDsPermission = createPermission({
  name: 'kro.rgds.show-events',
  attributes: { action: 'read' },
});

export const listResourcesPermission = createPermission({
  name: 'kro.resources.list',
  attributes: { action: 'read' },
});

export const viewYamlResourcesPermission = createPermission({
  name: 'kro.resources.view-yaml',
  attributes: { action: 'read' },
});

export const showEventsResourcesPermission = createPermission({
  name: 'kro.resources.show-events',
  attributes: { action: 'read' },
});

export const showResourceGraph = createPermission({
  name: 'kro.resource-graph.show',
  attributes: { action: 'read' },
});

export const showOverview = createPermission({
  name: 'kro.overview.view',
  attributes: { action: 'read' },
});

export const kroPermissions = [showOverview, showEventsResourcesPermission, viewYamlResourcesPermission, listResourcesPermission, showResourceGraph, showEventsRGDsPermission, viewYamlRGDsPermission, listRGDsPermission, showEventsInstancesPermission, viewYamlInstancesPermission, listInstancesPermission];