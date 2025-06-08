import { useEntity } from '@backstage/plugin-catalog-react';
import CrossplaneResourceGraph from './CrossplaneResourceGraph';
import CrossplaneV2ResourceGraph from './CrossplaneV2ResourceGraph';

const CrossplaneResourceGraphSelector = () => {
  const { entity } = useEntity();
  const version = entity?.metadata?.annotations?.['terasky.backstage.io/crossplane-version'];

  if (version === 'v2') {
    return <CrossplaneV2ResourceGraph />;
  }
  // Default to v1
  return <CrossplaneResourceGraph />;
};

export default CrossplaneResourceGraphSelector; 