import { useEntity } from '@backstage/plugin-catalog-react';
import CrossplaneOverviewCard from './CrossplaneOverviewCard';
import CrossplaneV2OverviewCard from './CrossplaneV2OverviewCard';

const CrossplaneOverviewCardSelector = () => {
  const { entity } = useEntity();
  const version = entity?.metadata?.annotations?.['terasky.backstage.io/crossplane-version'];

  if (version === 'v2') {
    return <CrossplaneV2OverviewCard />;
  }
  // Default to v1
  return <CrossplaneOverviewCard />;
};

export default CrossplaneOverviewCardSelector; 