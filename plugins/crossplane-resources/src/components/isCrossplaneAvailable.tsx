import { Entity } from '@backstage/catalog-model';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { usePermission } from '@backstage/plugin-permission-react';
import { showOverview, showResourceGraph, listClaimsPermission } from '@terasky/backstage-plugin-crossplane-common';

export const isCrossplaneAvailable = (entity: Entity): boolean => {
  return Boolean(entity.metadata.annotations?.['terasky.backstage.io/crossplane-resource']);
};

// Create wrapper components that handle the permission checks for content
export const IfCrossplaneOverviewAvailable = (props: { children: JSX.Element }) => {
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
  const { allowed } = usePermission({ permission: showOverview });
  
  return allowed || !enablePermissions ? props.children : null;
};

export const IfCrossplaneResourceGraphAvailable = (props: { children: JSX.Element }) => {
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
  const { allowed } = usePermission({ permission: showResourceGraph });
  
  return allowed || !enablePermissions ? props.children : null;
};

export const IfCrossplaneResourcesListAvailable = (props: { children: JSX.Element }) => {
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
  const { allowed } = usePermission({ permission: listClaimsPermission });
  
  return allowed || !enablePermissions ? props.children : null;
};

// Create components that provide the condition functions for EntityLayout.Route
export const useResourceGraphAvailable = () => {
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
  const { allowed } = usePermission({ permission: showResourceGraph });
  
  return (entity: Entity) => isCrossplaneAvailable(entity) && (!enablePermissions || allowed);
};

export const useResourcesListAvailable = () => {
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
  const { allowed } = usePermission({ permission: listClaimsPermission });
  
  return (entity: Entity) => isCrossplaneAvailable(entity) && (!enablePermissions || allowed);
};