// React import not needed for JSX in React 17+
import {
  Box,
  Button,
  ButtonIcon,
  Card,
  CardBody,
  Flex,
  Grid,
  NumberField,
  Text,
  TextField,
} from '@backstage/ui';
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import { CloudType, WorkerPoolConfig } from '../types';
import styles from './InfrastructureConfiguration.module.css';

interface InfrastructureConfigurationProps {
  cloudType: CloudType;
  controlPlaneConfig: Record<string, any>;
  workerPools: WorkerPoolConfig[];
  cloudConfig: Record<string, any>;
  onUpdate: (updates: {
    controlPlaneConfig?: Record<string, any>;
    workerPools?: WorkerPoolConfig[];
    cloudConfig?: Record<string, any>;
  }) => void;
}

export const InfrastructureConfiguration = ({
  controlPlaneConfig,
  workerPools,
  onUpdate,
}: InfrastructureConfigurationProps) => {
  const handleAddWorkerPool = () => {
    const newPool: WorkerPoolConfig = {
      name: `worker-pool-${workerPools.length + 1}`,
      size: 1,
      instanceType: '',
      minSize: 1,
      maxSize: 10,
    };
    onUpdate({ workerPools: [...workerPools, newPool] });
  };

  const handleRemoveWorkerPool = (index: number) => {
    const updated = [...workerPools];
    updated.splice(index, 1);
    onUpdate({ workerPools: updated });
  };

  const handleWorkerPoolChange = (
    index: number,
    field: keyof WorkerPoolConfig,
    value: any,
  ) => {
    const updated = [...workerPools];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate({ workerPools: updated });
  };

  const handleControlPlaneChange = (field: string, value: any) => {
    onUpdate({
      controlPlaneConfig: {
        ...controlPlaneConfig,
        [field]: value,
      },
    });
  };

  return (
    <Box p="4">
      <Text variant="title-medium" weight="bold" as="div">
        Infrastructure Configuration
      </Text>
      <Box mt="1" mb="4">
        <Text variant="body-small" color="secondary">
          Configure control plane and worker node pools for your cluster
        </Text>
      </Box>

      {/* Control Plane */}
      <Box mt="6">
        <Box mb="2">
          <Text variant="title-small" weight="bold" as="div">
            Control Plane
          </Text>
        </Box>
        <Grid.Root columns="12" gap="4">
          <Grid.Item colSpan={{ initial: '12', md: '4' }}>
            <TextField
              label="Instance Type"
              value={controlPlaneConfig.instanceType || ''}
              onChange={value => handleControlPlaneChange('instanceType', value)}
              placeholder="e.g., t3.medium"
              description="Instance type for control plane nodes"
            />
          </Grid.Item>
          <Grid.Item colSpan={{ initial: '12', md: '4' }}>
            <NumberField
              label="Node Count"
              value={controlPlaneConfig.count || 1}
              onChange={value => handleControlPlaneChange('count', value)}
              minValue={1}
              maxValue={10}
            />
          </Grid.Item>
          <Grid.Item colSpan={{ initial: '12', md: '4' }}>
            <NumberField
              label="Disk Size (GB)"
              value={controlPlaneConfig.diskSize || 60}
              onChange={value => handleControlPlaneChange('diskSize', value)}
              minValue={20}
            />
          </Grid.Item>
        </Grid.Root>
      </Box>

      <hr className={styles.divider} />

      {/* Worker Pools */}
      <Box mt="6">
        <Text variant="title-small" weight="bold" as="div">
          Worker Pools
        </Text>
        <Box mt="1" mb="4">
          <Text variant="body-small" color="secondary">
            Define one or more worker node pools
          </Text>
        </Box>

        {workerPools.map((pool, index) => (
          <Card key={index} className={styles.poolCard}>
            <CardBody>
              <Flex justify="between" align="center" mb="4">
                <Text variant="body-medium" weight="bold">
                  Worker Pool {index + 1}
                </Text>
                <ButtonIcon
                  icon={<RiDeleteBinLine />}
                  onPress={() => handleRemoveWorkerPool(index)}
                  size="small"
                  aria-label="Remove worker pool"
                />
              </Flex>

              <Grid.Root columns="12" gap="4">
                <Grid.Item colSpan={{ initial: '12', md: '6' }}>
                  <TextField
                    label="Pool Name"
                    value={pool.name}
                    onChange={value => handleWorkerPoolChange(index, 'name', value)}
                    isRequired
                  />
                </Grid.Item>
                <Grid.Item colSpan={{ initial: '12', md: '6' }}>
                  <TextField
                    label="Instance Type"
                    value={typeof pool.instanceType === 'string' ? pool.instanceType : ''}
                    onChange={value =>
                      handleWorkerPoolChange(index, 'instanceType', value)
                    }
                    placeholder="e.g., t3.large"
                  />
                </Grid.Item>
                <Grid.Item colSpan={{ initial: '12', md: '4' }}>
                  <NumberField
                    label="Size"
                    value={pool.size}
                    onChange={value => handleWorkerPoolChange(index, 'size', value)}
                    minValue={0}
                  />
                </Grid.Item>
                <Grid.Item colSpan={{ initial: '12', md: '4' }}>
                  <NumberField
                    label="Min Size"
                    value={pool.minSize || 0}
                    onChange={value => handleWorkerPoolChange(index, 'minSize', value)}
                    minValue={0}
                  />
                </Grid.Item>
                <Grid.Item colSpan={{ initial: '12', md: '4' }}>
                  <NumberField
                    label="Max Size"
                    value={pool.maxSize || 10}
                    onChange={value => handleWorkerPoolChange(index, 'maxSize', value)}
                    minValue={1}
                  />
                </Grid.Item>
              </Grid.Root>
            </CardBody>
          </Card>
        ))}

        <Button variant="primary" iconStart={<RiAddLine />} onPress={handleAddWorkerPool}>
          Add Worker Pool
        </Button>
      </Box>
    </Box>
  );
};
