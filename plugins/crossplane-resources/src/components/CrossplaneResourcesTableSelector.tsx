import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import CrossplaneV1ResourcesTable from './CrossplaneV1ResourceTable';
import CrossplaneV2ResourcesTable from './CrossplaneV2ResourceTable';
import { getAnnotation, getAnnotationPrefix } from './annotationUtils';

const CrossplaneResourcesTableSelector = () => {
  const { entity } = useEntity();
  const config = useApi(configApiRef);
  const annotationPrefix = getAnnotationPrefix(config);
  const annotations = entity?.metadata?.annotations || {};
  const version = getAnnotation(annotations, annotationPrefix, 'crossplane-version');

  if (version === 'v2') {
    return <CrossplaneV2ResourcesTable />;
  }
  // Default to v1
  return <CrossplaneV1ResourcesTable />;
};

export default CrossplaneResourcesTableSelector; 
