import { useEntity } from '@backstage/plugin-catalog-react';
import {
  InfoCard,
  Progress,
  ResponseErrorPanel,
  StructuredMetadataTable,
} from '@backstage/core-components';
import useAsync from 'react-use/lib/useAsync';
import { useApi } from '@backstage/core-plugin-api';
import { vcfAutomationApiRef } from '../api/VcfAutomationClient';

export const VCFAutomationGenericResourceOverview = () => {
  const { entity } = useEntity();
  const vcfAutomationApi = useApi(vcfAutomationApiRef);
  const deploymentId = entity.spec?.system || '';
  const resourceId = entity.metadata.name;
  const instanceName = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-instance'];

  const { value: resourceData, loading, error } = useAsync(async () => {
    if (!deploymentId || !resourceId) return undefined;
    return await vcfAutomationApi.getGenericResourceDetails(deploymentId as string, resourceId as string, instanceName);
  }, [deploymentId, resourceId, instanceName]);

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (loading) {
    return <Progress />;
  }

  if (!deploymentId || !resourceId) {
    return (
      <InfoCard title="No Resource Information">
        This entity is not associated with a VCF resource.
      </InfoCard>
    );
  }

  if (!resourceData) {
    return <InfoCard title="No Data">No resource details available.</InfoCard>;
  }

  // Extract the overview fields if they exist
  const overviewData: Record<string, any> = {};
  
  if (resourceData.name) overviewData.Name = resourceData.name;
  if (resourceData.type) overviewData.Type = resourceData.type;
  if (resourceData.createdAt) overviewData['Created At'] = new Date(resourceData.createdAt).toLocaleString();
  if (resourceData.syncStatus) overviewData['Sync Status'] = resourceData.syncStatus;
  if (resourceData.origin) overviewData.Origin = resourceData.origin;
  if (resourceData.status) overviewData.Status = resourceData.status;

  return (
    <InfoCard title="Resource Overview">
      <StructuredMetadataTable metadata={overviewData} />
    </InfoCard>
  );
}; 