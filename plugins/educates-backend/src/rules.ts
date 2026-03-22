import {
  createPermissionResourceRef,
  createPermissionRule,
} from '@backstage/plugin-permission-node';
import { 
  EDUCATES_TRAINING_PORTAL_RESOURCE_TYPE,
  EDUCATES_WORKSHOP_RESOURCE_TYPE 
} from '@terasky/backstage-plugin-educates-common';
import { z, type ZodType } from 'zod/v3';

// Define resource types
export interface EducatesPortalResource {
  portalName: string;
}

export interface EducatesWorkshopResource {
  portalName: string;
  workshopName: string;
}

// Create permission resource references
export const educatesPortalPermissionResourceRef = createPermissionResourceRef<
  EducatesPortalResource,
  unknown
>().with({
  pluginId: 'educates',
  resourceType: EDUCATES_TRAINING_PORTAL_RESOURCE_TYPE,
});

export const educatesWorkshopPermissionResourceRef = createPermissionResourceRef<
  EducatesWorkshopResource,
  unknown
>().with({
  pluginId: 'educates',
  resourceType: EDUCATES_WORKSHOP_RESOURCE_TYPE,
});

// Portal permission rules
export const isPortalOwner = createPermissionRule<
  typeof educatesPortalPermissionResourceRef,
  { userRefs: string[] }
>({
  name: 'IS_PORTAL_OWNER',
  description: 'Allow users who are owners of a training portal',
  resourceRef: educatesPortalPermissionResourceRef,
  paramsSchema: z.object({
    userRefs: z.array(z.string()).describe('User entity refs to match'),
  }) as ZodType<{ userRefs: string[] }>,
  apply: (_resource: EducatesPortalResource, { userRefs }) => {
    return userRefs.length > 0;
  },
  toQuery: () => {
    return { anyOf: [] };
  },
});

export const hasPortalAccess = createPermissionRule<
  typeof educatesPortalPermissionResourceRef,
  { userRefs: string[]; portalName: string }
>({
  name: 'HAS_PORTAL_ACCESS',
  description: 'Allow users who have been granted access to a specific portal',
  resourceRef: educatesPortalPermissionResourceRef,
  paramsSchema: z.object({
    userRefs: z.array(z.string()).describe('User entity refs to check'),
    portalName: z.string().describe('Portal name to check access for'),
  }) as ZodType<{ userRefs: string[]; portalName: string }>,
  apply: (resource: EducatesPortalResource, { userRefs, portalName }) => {
    return resource.portalName === portalName && userRefs.length > 0;
  },
  toQuery: ({ portalName }) => {
    return {
      anyOf: [portalName],
    };
  },
});

// Workshop permission rules
export const isWorkshopOwner = createPermissionRule<
  typeof educatesWorkshopPermissionResourceRef,
  { userRefs: string[] }
>({
  name: 'IS_WORKSHOP_OWNER',
  description: 'Allow users who are owners of a workshop',
  resourceRef: educatesWorkshopPermissionResourceRef,
  paramsSchema: z.object({
    userRefs: z.array(z.string()).describe('User entity refs to match'),
  }) as ZodType<{ userRefs: string[] }>,
  apply: (_resource: EducatesWorkshopResource, { userRefs }) => {
    return userRefs.length > 0;
  },
  toQuery: () => {
    return { anyOf: [] };
  },
});

export const hasWorkshopAccess = createPermissionRule<
  typeof educatesWorkshopPermissionResourceRef,
  { userRefs: string[]; portalName: string; workshopName: string }
>({
  name: 'HAS_WORKSHOP_ACCESS',
  description: 'Allow users who have been granted access to a specific workshop',
  resourceRef: educatesWorkshopPermissionResourceRef,
  paramsSchema: z.object({
    userRefs: z.array(z.string()).describe('User entity refs to check'),
    portalName: z.string().describe('Portal name'),
    workshopName: z.string().describe('Workshop name to check access for'),
  }) as ZodType<{ userRefs: string[]; portalName: string; workshopName: string }>,
  apply: (resource: EducatesWorkshopResource, { userRefs, portalName, workshopName }) => {
    return resource.portalName === portalName && 
           resource.workshopName === workshopName && 
           userRefs.length > 0;
  },
  toQuery: ({ portalName, workshopName }) => {
    return {
      anyOf: [`${portalName}:${workshopName}`],
    };
  },
});

// Export rules grouped by resource type
export const rules = {
  portal: {
    isPortalOwner,
    hasPortalAccess,
  },
  workshop: {
    isWorkshopOwner,
    hasWorkshopAccess,
  },
}; 