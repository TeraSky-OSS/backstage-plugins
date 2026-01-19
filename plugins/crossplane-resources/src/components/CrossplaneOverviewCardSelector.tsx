import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import CrossplaneOverviewCard from './CrossplaneV1OverviewCard';
import CrossplaneV2OverviewCard from './CrossplaneV2OverviewCard';
import { getAnnotation, getAnnotationPrefix } from './annotationUtils';

const CrossplaneOverviewCardSelector = () => {
  const { entity } = useEntity();
  const config = useApi(configApiRef);
  const annotationPrefix = getAnnotationPrefix(config);
  const annotations = entity?.metadata?.annotations || {};
  const version = getAnnotation(annotations, annotationPrefix, 'crossplane-version');

  if (version === 'v2') {
    return <CrossplaneV2OverviewCard />;
  }
  // Default to v1
  return <CrossplaneOverviewCard />;
};

export default CrossplaneOverviewCardSelector; 
