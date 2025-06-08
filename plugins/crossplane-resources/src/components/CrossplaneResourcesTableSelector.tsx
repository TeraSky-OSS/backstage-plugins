import { useEntity } from '@backstage/plugin-catalog-react';
import CrossplaneAllResourcesTable from './CrossplaneAllResourcesTable';
import CrossplaneV2ResourcesTable from './CrossplaneV2ResourcesTable';

const CrossplaneResourcesTableSelector = () => {
  const { entity } = useEntity();
  const version = entity?.metadata?.annotations?.['terasky.backstage.io/crossplane-version'];

  if (version === 'v2') {
    return <CrossplaneV2ResourcesTable />;
  }
  // Default to v1
  return <CrossplaneAllResourcesTable />;
};

export default CrossplaneResourcesTableSelector; 