// React import not needed for JSX in React 17+
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Paper,
  Grid,
  Divider,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import { CloudType, WorkerPoolConfig } from '../types';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  section: {
    marginTop: theme.spacing(3),
  },
  poolPaper: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  poolHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
}));

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
  const classes = useStyles();

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
    <Box className={classes.root}>
      <Typography variant="h5" gutterBottom>
        Infrastructure Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Configure control plane and worker node pools for your cluster
      </Typography>

      {/* Control Plane */}
      <Box className={classes.section}>
        <Typography variant="h6" gutterBottom>
          Control Plane
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Instance Type"
              value={controlPlaneConfig.instanceType || ''}
              onChange={e => handleControlPlaneChange('instanceType', e.target.value)}
              fullWidth
              placeholder="e.g., t3.medium"
              helperText="Instance type for control plane nodes"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Node Count"
              type="number"
              value={controlPlaneConfig.count || 1}
              onChange={e =>
                handleControlPlaneChange('count', parseInt(e.target.value, 10))
              }
              fullWidth
              inputProps={{ min: 1, max: 10 }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Disk Size (GB)"
              type="number"
              value={controlPlaneConfig.diskSize || 60}
              onChange={e =>
                handleControlPlaneChange('diskSize', parseInt(e.target.value, 10))
              }
              fullWidth
              inputProps={{ min: 20 }}
            />
          </Grid>
        </Grid>
      </Box>

      <Divider style={{ margin: '24px 0' }} />

      {/* Worker Pools */}
      <Box className={classes.section}>
        <Typography variant="h6" gutterBottom>
          Worker Pools
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Define one or more worker node pools
        </Typography>

        {workerPools.map((pool, index) => (
          <Paper key={index} className={classes.poolPaper}>
            <Box className={classes.poolHeader}>
              <Typography variant="subtitle1">Worker Pool {index + 1}</Typography>
              <IconButton
                onClick={() => handleRemoveWorkerPool(index)}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Pool Name"
                  value={pool.name}
                  onChange={e => handleWorkerPoolChange(index, 'name', e.target.value)}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Instance Type"
                  value={pool.instanceType || ''}
                  onChange={e =>
                    handleWorkerPoolChange(index, 'instanceType', e.target.value)
                  }
                  fullWidth
                  placeholder="e.g., t3.large"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Size"
                  type="number"
                  value={pool.size}
                  onChange={e =>
                    handleWorkerPoolChange(index, 'size', parseInt(e.target.value, 10))
                  }
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Min Size"
                  type="number"
                  value={pool.minSize || 0}
                  onChange={e =>
                    handleWorkerPoolChange(index, 'minSize', parseInt(e.target.value, 10))
                  }
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Max Size"
                  type="number"
                  value={pool.maxSize || 10}
                  onChange={e =>
                    handleWorkerPoolChange(index, 'maxSize', parseInt(e.target.value, 10))
                  }
                  fullWidth
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>
          </Paper>
        ))}

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddWorkerPool}
        >
          Add Worker Pool
        </Button>
      </Box>
    </Box>
  );
};
