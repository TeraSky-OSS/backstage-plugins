import { Box, Typography } from '@material-ui/core';
import CrossplaneV2CompositeResourcesTable from './CrossplaneV2CompositeResourcesTable';
import CrossplaneV2ManagedResources from './CrossplaneV2ManagedResources';
import CrossplaneV2OverviewCard from './CrossplaneV2OverviewCard';
import CrossplaneV2UsedResourcesTable from './CrossplaneV2UsedResourcesTable';

const CrossplaneV2ResourcesTable = () => {
    return (
        <Box>
            <Typography variant="h5" gutterBottom style={{ marginTop: '2rem' }}>
                Overview
            </Typography>
            <CrossplaneV2OverviewCard />
            
            <Typography variant="h5" gutterBottom>
                Composite Resource
            </Typography>
            <CrossplaneV2CompositeResourcesTable />

            <Typography variant="h5" gutterBottom style={{ marginTop: '2rem' }}>
                Managed Resources
            </Typography>
            <CrossplaneV2ManagedResources />

            <Typography variant="h5" gutterBottom style={{ marginTop: '2rem' }}>
                Additional Crossplane Resources
            </Typography>
            <CrossplaneV2UsedResourcesTable />
        </Box>
    );
};

export default CrossplaneV2ResourcesTable; 