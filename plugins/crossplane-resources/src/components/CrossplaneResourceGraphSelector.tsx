import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import CrossplaneV1ResourceGraph from './CrossplaneV1ResourceGraph';
import CrossplaneV2ResourceGraph from './CrossplaneV2ResourceGraph';
import { getAnnotation, getAnnotationPrefix } from './annotationUtils';

const CrossplaneResourceGraphSelector = () => {
  const { entity } = useEntity();
  const config = useApi(configApiRef);
  const annotationPrefix = getAnnotationPrefix(config);
  const annotations = entity?.metadata?.annotations || {};
  const version = getAnnotation(annotations, annotationPrefix, 'crossplane-version');

  if (version === 'v2') {
    return <CrossplaneV2ResourceGraph />;
  }
  // Default to v1
  return <CrossplaneV1ResourceGraph />;
};

export default CrossplaneResourceGraphSelector; 
