// React import not needed for JSX in React 17+
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  section: {
    marginTop: theme.spacing(2),
  },
  accordion: {
    marginBottom: theme.spacing(2),
  },
}));

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
  const classes = useStyles();

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
    <Box className={classes.root}>
      <Typography variant="h5" gutterBottom>
        Global Settings
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Configure scanning policies and backup settings (all optional)
      </Typography>

      {/* Scanning Policies */}
      <Accordion className={classes.accordion}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Scanning Policies</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Configuration Scanning */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Configuration Scanning
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Scan Interval (hours)"
                    type="number"
                    value={
                      policies.scanPolicy?.configurationScanning?.interval || ''
                    }
                    onChange={e =>
                      updateScanPolicy(
                        'configurationScanning',
                        'interval',
                        parseInt(e.target.value, 10),
                      )
                    }
                    fullWidth
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Deploy After"
                    value={
                      policies.scanPolicy?.configurationScanning?.deployAfter || ''
                    }
                    onChange={e =>
                      updateScanPolicy(
                        'configurationScanning',
                        'deployAfter',
                        e.target.value,
                      )
                    }
                    fullWidth
                    placeholder="e.g., 1h, 30m"
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Penetration Scanning */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Penetration Scanning
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Scan Interval (hours)"
                    type="number"
                    value={
                      policies.scanPolicy?.penetrationScanning?.interval || ''
                    }
                    onChange={e =>
                      updateScanPolicy(
                        'penetrationScanning',
                        'interval',
                        parseInt(e.target.value, 10),
                      )
                    }
                    fullWidth
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Deploy After"
                    value={
                      policies.scanPolicy?.penetrationScanning?.deployAfter || ''
                    }
                    onChange={e =>
                      updateScanPolicy(
                        'penetrationScanning',
                        'deployAfter',
                        e.target.value,
                      )
                    }
                    fullWidth
                    placeholder="e.g., 1h, 30m"
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Conformance Scanning */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Conformance Scanning
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Scan Interval (hours)"
                    type="number"
                    value={
                      policies.scanPolicy?.conformanceScanning?.interval || ''
                    }
                    onChange={e =>
                      updateScanPolicy(
                        'conformanceScanning',
                        'interval',
                        parseInt(e.target.value, 10),
                      )
                    }
                    fullWidth
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Deploy After"
                    value={
                      policies.scanPolicy?.conformanceScanning?.deployAfter || ''
                    }
                    onChange={e =>
                      updateScanPolicy(
                        'conformanceScanning',
                        'deployAfter',
                        e.target.value,
                      )
                    }
                    fullWidth
                    placeholder="e.g., 1h, 30m"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Backup Policy */}
      <Accordion className={classes.accordion}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Backup Policy</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Backup Name"
                value={policies.backupPolicy?.backupConfig?.backupName || ''}
                onChange={e => updateBackupPolicy('backupName', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Backup Prefix"
                value={policies.backupPolicy?.backupConfig?.backupPrefix || ''}
                onChange={e => updateBackupPolicy('backupPrefix', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Duration (hours)"
                type="number"
                value={policies.backupPolicy?.backupConfig?.durationInHours || ''}
                onChange={e =>
                  updateBackupPolicy('durationInHours', parseInt(e.target.value, 10))
                }
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Location Type"
                value={policies.backupPolicy?.backupConfig?.locationType || ''}
                onChange={e => updateBackupPolicy('locationType', e.target.value)}
                fullWidth
                placeholder="e.g., s3, azure"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      policies.backupPolicy?.backupConfig?.includeAllDisks || false
                    }
                    onChange={e =>
                      updateBackupPolicy('includeAllDisks', e.target.checked)
                    }
                    color="primary"
                  />
                }
                label="Include All Disks"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      policies.backupPolicy?.backupConfig?.includeClusterResources ||
                      false
                    }
                    onChange={e =>
                      updateBackupPolicy('includeClusterResources', e.target.checked)
                    }
                    color="primary"
                  />
                }
                label="Include Cluster Resources"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
