import { createRouteRef } from '@backstage/frontend-plugin-api';

export const rootRouteRef = createRouteRef();

export const editTemplateRouteRef = createRouteRef({
  params: ['namespace', 'kind', 'name'],
});
