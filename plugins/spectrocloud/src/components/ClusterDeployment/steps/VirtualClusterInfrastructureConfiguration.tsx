import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  Grid,
  InputAdornment,
  Chip,
} from '@material-ui/core';
import { Alert, Autocomplete } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { ClusterDeploymentState } from '../types';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  section: {
    marginTop: theme.spacing(4),
  },
  sectionHeader: {
    marginBottom: theme.spacing(2),
  },
  formField: {
    marginBottom: theme.spacing(2),
  },
  projectChip: {
    marginLeft: theme.spacing(1),
    fontSize: '0.75rem',
  },
}));

interface ClusterGroup {
  metadata: {
    uid: string;
    name: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    clustersConfig?: {
      endpointType?: 'Ingress' | 'LoadBalancer';
    };
  };
  status?: {
    limitConfig?: {
      cpuMilliCore?: number;
      memoryMiB?: number;
      storageGiB?: number;
    };
  };
}

interface VirtualClusterInfrastructureConfigurationProps {
  state: ClusterDeploymentState;
  onChange: (updates: Partial<ClusterDeploymentState>) => void;
}

export const VirtualClusterInfrastructureConfiguration = ({
  state,
  onChange,
}: VirtualClusterInfrastructureConfigurationProps) => {
  const classes = useStyles();
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const [clusterGroups, setClusterGroups] = useState<ClusterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchClusterGroups = async () => {
      try {
        setLoading(true);
        const result = await spectroCloudApi.getClusterGroups(state.projectUid);
        // The API returns { items: ClusterGroup[] } structure
        const groups = result.items || result || [];
        setClusterGroups(groups);
        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cluster groups');
      } finally {
        setLoading(false);
      }
    };

    if (state.projectUid) {
      fetchClusterGroups();
    }
  }, [spectroCloudApi, state.projectUid]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={classes.root}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const selectedGroup = clusterGroups.find(
    g => g.metadata.uid === state.cloudConfig.clusterGroupUid
  );

  // Get resource quotas from state
  const cpuCores = state.cloudConfig.cpuCores || 4;
  const memoryGiB = state.cloudConfig.memoryGiB || 8;
  const storageGiB = state.cloudConfig.storageGiB || 20;

  // Get cluster name from state
  const clusterName = state.clusterName || '';

  return (
    <Box className={classes.root}>
      <Typography variant="h5" gutterBottom>
        Virtual Cluster Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Configure your virtual cluster settings
      </Typography>

      {/* Virtual Cluster Name */}
      <Box className={classes.formField}>
        <TextField
          fullWidth
          label="Virtual cluster name *"
          value={clusterName}
          onChange={(e) => onChange({ clusterName: e.target.value })}
          required
          helperText="Enter a unique name for your virtual cluster (lowercase alphanumeric and hyphens only)"
          error={clusterName !== '' && !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(clusterName)}
        />
      </Box>

      {/* Cluster Group Selection */}
      <Box className={classes.formField}>
        <Autocomplete
          options={clusterGroups}
          getOptionLabel={(option) => option.metadata.name}
          value={selectedGroup || null}
          onChange={(_, newValue) => {
            if (newValue) {
              onChange({
                cloudConfig: {
                  ...state.cloudConfig,
                  clusterGroupUid: newValue.metadata.uid,
                  clusterGroupName: newValue.metadata.name,
                  endpointType: newValue.spec?.clustersConfig?.endpointType || 'LoadBalancer',
                },
              });
            }
          }}
          renderOption={(option) => (
            <Box display="flex" alignItems="center">
              {option.metadata.name}
              <Chip
                label={
                  option.metadata.annotations?.['scope.name'] ||
                  option.metadata.annotations?.projectName ||
                  'PROJECT'
                }
                size="small"
                className={classes.projectChip}
                color="primary"
              />
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select cluster group *"
              required
              helperText={`${clusterGroups.length} cluster group${
                clusterGroups.length !== 1 ? 's' : ''
              } available`}
            />
          )}
        />
      </Box>

      {/* Quotas Section */}
      <Box className={classes.section}>
        <Typography variant="h6" className={classes.sectionHeader}>
          Resource Quotas
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="CPU *"
              value={cpuCores}
              onChange={(e) =>
                onChange({
                  cloudConfig: {
                    ...state.cloudConfig,
                    cpuCores: parseInt(e.target.value, 10) || 0,
                  },
                })
              }
              required
              InputProps={{
                endAdornment: <InputAdornment position="end">CPU</InputAdornment>,
                inputProps: { min: 1, step: 1 },
              }}
              helperText="Number of CPU cores"
              error={cpuCores !== undefined && cpuCores <= 0}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Memory *"
              value={memoryGiB}
              onChange={(e) =>
                onChange({
                  cloudConfig: {
                    ...state.cloudConfig,
                    memoryGiB: parseInt(e.target.value, 10) || 0,
                  },
                })
              }
              required
              InputProps={{
                endAdornment: <InputAdornment position="end">GiB</InputAdornment>,
                inputProps: { min: 1, step: 1 },
              }}
              helperText="Memory in GiB"
              error={memoryGiB !== undefined && memoryGiB <= 0}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Storage *"
              value={storageGiB}
              onChange={(e) =>
                onChange({
                  cloudConfig: {
                    ...state.cloudConfig,
                    storageGiB: parseInt(e.target.value, 10) || 0,
                  },
                })
              }
              required
              InputProps={{
                endAdornment: <InputAdornment position="end">GiB</InputAdornment>,
                inputProps: { min: 1, step: 1 },
              }}
              helperText="Storage in GiB"
              error={storageGiB !== undefined && storageGiB <= 0}
            />
          </Grid>
        </Grid>

        {selectedGroup?.status?.limitConfig && (
          <Box mt={2}>
            <Alert severity="info">
              Cluster Group Limits:{' '}
              CPU:{' '}
              {selectedGroup.status.limitConfig.cpuMilliCore
                ? Math.floor(selectedGroup.status.limitConfig.cpuMilliCore / 1000)
                : 'N/A'}{' '}
              cores, Memory:{' '}
              {selectedGroup.status.limitConfig.memoryMiB
                ? Math.floor(selectedGroup.status.limitConfig.memoryMiB / 1024)
                : 'N/A'}{' '}
              GiB, Storage: {selectedGroup.status.limitConfig.storageGiB || 'N/A'} GiB
            </Alert>
          </Box>
        )}
      </Box>
    </Box>
  );
};
