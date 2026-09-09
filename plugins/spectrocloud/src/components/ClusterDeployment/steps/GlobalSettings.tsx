// React import not needed for JSX in React 17+
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Box,
  Checkbox,
  Flex,
  Grid,
  NumberField,
  Text,
  TextField,
} from '@backstage/ui';

interface GlobalSettingsProps {
  policies: {
    scanPolicy?: {
      configurationScanning?: {
        deployAfter?: string;
        interval?: number;
        schedule?: string;
      };
      penetrationScanning?: {
        deployAfter?: string;
        interval?: number;
        schedule?: string;
      };
      conformanceScanning?: {
        deployAfter?: string;
        interval?: number;
        schedule?: string;
      };
    };
    backupPolicy?: {
      backupConfig?: {
        backupLocationName?: string;
        backupLocationUid?: string;
        backupName?: string;
        backupPrefix?: string;
        durationInHours?: number;
        includeAllDisks?: boolean;
        includeClusterResources?: boolean;
        locationType?: string;
        namespaces?: string[];
        schedule?: {
          scheduledRunTime?: string;
        };
      };
    };
  };
  onUpdate: (policies: any) => void;
}

export const GlobalSettings = ({ policies, onUpdate }: GlobalSettingsProps) => {
  const updateScanPolicy = (
    scanType: 'configurationScanning' | 'penetrationScanning' | 'conformanceScanning',
    field: string,
    value: any,
  ) => {
    onUpdate({
      ...policies,
      scanPolicy: {
        ...policies.scanPolicy,
        [scanType]: {
          ...policies.scanPolicy?.[scanType],
          [field]: value,
        },
      },
    });
  };

  const updateBackupPolicy = (field: string, value: any) => {
    onUpdate({
      ...policies,
      backupPolicy: {
        ...policies.backupPolicy,
        backupConfig: {
          ...policies.backupPolicy?.backupConfig,
          [field]: value,
        },
      },
    });
  };

  return (
    <Box p="4">
      <Text variant="title-medium" weight="bold" as="div">
        Global Settings
      </Text>
      <Box mt="1" mb="4">
        <Text variant="body-small" color="secondary">
          Configure scanning policies and backup settings (all optional)
        </Text>
      </Box>

      {/* Scanning Policies */}
      <Box mb="4">
        <Accordion>
          <AccordionTrigger>Scanning Policies</AccordionTrigger>
          <AccordionPanel>
            <Flex direction="column" gap="6">
              {/* Configuration Scanning */}
              <Box>
                <Box mb="2">
                  <Text variant="body-medium" weight="bold" as="div">
                    Configuration Scanning
                  </Text>
                </Box>
                <Grid.Root columns="12" gap="4">
                  <Grid.Item colSpan={{ initial: '12', md: '6' }}>
                    <NumberField
                      label="Scan Interval (hours)"
                      value={policies.scanPolicy?.configurationScanning?.interval}
                      onChange={value =>
                        updateScanPolicy('configurationScanning', 'interval', value)
                      }
                      minValue={1}
                    />
                  </Grid.Item>
                  <Grid.Item colSpan={{ initial: '12', md: '6' }}>
                    <TextField
                      label="Deploy After"
                      value={policies.scanPolicy?.configurationScanning?.deployAfter || ''}
                      onChange={value =>
                        updateScanPolicy('configurationScanning', 'deployAfter', value)
                      }
                      placeholder="e.g., 1h, 30m"
                    />
                  </Grid.Item>
                </Grid.Root>
              </Box>

              {/* Penetration Scanning */}
              <Box>
                <Box mb="2">
                  <Text variant="body-medium" weight="bold" as="div">
                    Penetration Scanning
                  </Text>
                </Box>
                <Grid.Root columns="12" gap="4">
                  <Grid.Item colSpan={{ initial: '12', md: '6' }}>
                    <NumberField
                      label="Scan Interval (hours)"
                      value={policies.scanPolicy?.penetrationScanning?.interval}
                      onChange={value =>
                        updateScanPolicy('penetrationScanning', 'interval', value)
                      }
                      minValue={1}
                    />
                  </Grid.Item>
                  <Grid.Item colSpan={{ initial: '12', md: '6' }}>
                    <TextField
                      label="Deploy After"
                      value={policies.scanPolicy?.penetrationScanning?.deployAfter || ''}
                      onChange={value =>
                        updateScanPolicy('penetrationScanning', 'deployAfter', value)
                      }
                      placeholder="e.g., 1h, 30m"
                    />
                  </Grid.Item>
                </Grid.Root>
              </Box>

              {/* Conformance Scanning */}
              <Box>
                <Box mb="2">
                  <Text variant="body-medium" weight="bold" as="div">
                    Conformance Scanning
                  </Text>
                </Box>
                <Grid.Root columns="12" gap="4">
                  <Grid.Item colSpan={{ initial: '12', md: '6' }}>
                    <NumberField
                      label="Scan Interval (hours)"
                      value={policies.scanPolicy?.conformanceScanning?.interval}
                      onChange={value =>
                        updateScanPolicy('conformanceScanning', 'interval', value)
                      }
                      minValue={1}
                    />
                  </Grid.Item>
                  <Grid.Item colSpan={{ initial: '12', md: '6' }}>
                    <TextField
                      label="Deploy After"
                      value={policies.scanPolicy?.conformanceScanning?.deployAfter || ''}
                      onChange={value =>
                        updateScanPolicy('conformanceScanning', 'deployAfter', value)
                      }
                      placeholder="e.g., 1h, 30m"
                    />
                  </Grid.Item>
                </Grid.Root>
              </Box>
            </Flex>
          </AccordionPanel>
        </Accordion>
      </Box>

      {/* Backup Policy */}
      <Box mb="4">
        <Accordion>
          <AccordionTrigger>Backup Policy</AccordionTrigger>
          <AccordionPanel>
            <Grid.Root columns="12" gap="4">
              <Grid.Item colSpan={{ initial: '12', md: '6' }}>
                <TextField
                  label="Backup Name"
                  value={policies.backupPolicy?.backupConfig?.backupName || ''}
                  onChange={value => updateBackupPolicy('backupName', value)}
                />
              </Grid.Item>
              <Grid.Item colSpan={{ initial: '12', md: '6' }}>
                <TextField
                  label="Backup Prefix"
                  value={policies.backupPolicy?.backupConfig?.backupPrefix || ''}
                  onChange={value => updateBackupPolicy('backupPrefix', value)}
                />
              </Grid.Item>
              <Grid.Item colSpan={{ initial: '12', md: '6' }}>
                <NumberField
                  label="Duration (hours)"
                  value={policies.backupPolicy?.backupConfig?.durationInHours}
                  onChange={value => updateBackupPolicy('durationInHours', value)}
                  minValue={1}
                />
              </Grid.Item>
              <Grid.Item colSpan={{ initial: '12', md: '6' }}>
                <TextField
                  label="Location Type"
                  value={policies.backupPolicy?.backupConfig?.locationType || ''}
                  onChange={value => updateBackupPolicy('locationType', value)}
                  placeholder="e.g., s3, azure"
                />
              </Grid.Item>
              <Grid.Item colSpan="12">
                <Checkbox
                  isSelected={policies.backupPolicy?.backupConfig?.includeAllDisks || false}
                  onChange={isSelected => updateBackupPolicy('includeAllDisks', isSelected)}
                >
                  Include All Disks
                </Checkbox>
              </Grid.Item>
              <Grid.Item colSpan="12">
                <Checkbox
                  isSelected={
                    policies.backupPolicy?.backupConfig?.includeClusterResources || false
                  }
                  onChange={isSelected =>
                    updateBackupPolicy('includeClusterResources', isSelected)
                  }
                >
                  Include Cluster Resources
                </Checkbox>
              </Grid.Item>
            </Grid.Root>
          </AccordionPanel>
        </Accordion>
      </Box>
    </Box>
  );
};
