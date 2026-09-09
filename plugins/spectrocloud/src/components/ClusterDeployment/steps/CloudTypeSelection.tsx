// React import not needed for JSX in React 17+
import { Box, Card, Grid, Text } from '@backstage/ui';
import { RiCloudLine } from '@remixicon/react';
import { CloudType, CLOUD_TYPE_LABELS, CLOUD_TYPE_DESCRIPTIONS } from '../types';
import styles from './CloudTypeSelection.module.css';

interface CloudTypeSelectionProps {
  selectedCloudType?: CloudType;
  onSelect: (cloudType: CloudType) => void;
}

// Supported cloud types for deployment
const CLOUD_TYPES: CloudType[] = ['vsphere', 'virtual'];

export const CloudTypeSelection = ({
  selectedCloudType,
  onSelect,
}: CloudTypeSelectionProps) => {
  return (
    <Box p="4">
      <Text variant="title-medium" weight="bold" as="div">
        Select Cloud Platform
      </Text>
      <Box mt="1" mb="4">
        <Text variant="body-small" color="secondary">
          Choose the cloud platform where you want to deploy your Kubernetes cluster
        </Text>
      </Box>

      <Grid.Root columns="12" gap="6">
        {CLOUD_TYPES.map(cloudType => (
          <Grid.Item colSpan={{ initial: '12', sm: '6', md: '4' }} key={cloudType}>
            <Card
              onPress={() => onSelect(cloudType)}
              label={CLOUD_TYPE_LABELS[cloudType]}
              className={`${styles.card} ${
                selectedCloudType === cloudType ? styles.selectedCard : ''
              }`}
            >
              <Box className={styles.cardContent}>
                <RiCloudLine size={64} className={styles.icon} />
                <Text variant="title-small" weight="bold" as="div">
                  {CLOUD_TYPE_LABELS[cloudType]}
                </Text>
                <Text variant="body-small" color="secondary" as="div">
                  {CLOUD_TYPE_DESCRIPTIONS[cloudType]}
                </Text>
              </Box>
            </Card>
          </Grid.Item>
        ))}
      </Grid.Root>
    </Box>
  );
};
