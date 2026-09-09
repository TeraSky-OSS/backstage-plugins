import { useEffect, useState } from 'react';
import type { Key } from 'react';
import { Alert, Box, Combobox, Text } from '@backstage/ui';
import { Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { SpectroCloudAccount } from '../../../api/SpectroCloudApi';
import { CloudType } from '../types';

interface CloudAccountSelectionProps {
  cloudType: CloudType;
  projectUid: string;
  selectedAccountUid?: string;
  onSelect: (accountUid: string, accountName: string) => void;
}

export const CloudAccountSelection = ({
  cloudType,
  projectUid,
  selectedAccountUid,
  onSelect,
}: CloudAccountSelectionProps) => {
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const [accounts, setAccounts] = useState<SpectroCloudAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const result = await spectroCloudApi.getCloudAccounts(cloudType, projectUid);
        // Sort accounts alphabetically
        const sortedAccounts = result.sort((a, b) =>
          a.metadata.name.localeCompare(b.metadata.name)
        );
        setAccounts(sortedAccounts);
        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cloud accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [spectroCloudApi, cloudType, projectUid]);

  if (loading) {
    return (
      <Box display="flex" style={{ justifyContent: 'center', alignItems: 'center' }} minHeight="200px">
        <Progress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p="4">
        <Alert status="danger" description={error} />
      </Box>
    );
  }

  if (accounts.length === 0) {
    return (
      <Box p="4">
        <Alert
          status="warning"
          description="No cloud accounts found for this cloud type and project. Please create a cloud account in Spectro Cloud first."
        />
      </Box>
    );
  }

  return (
    <Box p="4">
      <Text variant="title-medium" weight="bold" as="div">
        Select Cloud Account
      </Text>
      <Box mt="1" mb="4">
        <Text variant="body-small" color="secondary">
          Choose the cloud account to use for deploying the cluster
        </Text>
      </Box>

      <Combobox
        options={accounts.map(a => ({
          id: a.metadata.uid,
          label: a.metadata.name,
        }))}
        label="Cloud Account *"
        isRequired
        description={`${accounts.length} cloud account${
          accounts.length !== 1 ? 's' : ''
        } available for ${cloudType}`}
        selectedKey={selectedAccountUid ?? null}
        onSelectionChange={(key: Key | null) => {
          if (key !== null) {
            const account = accounts.find(a => a.metadata.uid === key);
            if (account) {
              onSelect(account.metadata.uid, account.metadata.name);
            }
          }
        }}
      />
    </Box>
  );
};
