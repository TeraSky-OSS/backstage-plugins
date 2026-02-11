import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
} from '@material-ui/core';
import { Alert, Autocomplete } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { SpectroCloudAccount } from '../../../api/SpectroCloudApi';
import { CloudType } from '../types';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  formControl: {
    marginTop: theme.spacing(2),
    width: '100%',
  },
}));

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
  const classes = useStyles();
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
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

  if (accounts.length === 0) {
    return (
      <Box className={classes.root}>
        <Alert severity="warning">
          No cloud accounts found for this cloud type and project. Please create a cloud
          account in Spectro Cloud first.
        </Alert>
      </Box>
    );
  }

  return (
    <Box className={classes.root}>
      <Typography variant="h5" gutterBottom>
        Select Cloud Account
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Choose the cloud account to use for deploying the cluster
      </Typography>

      <Autocomplete
        options={accounts}
        getOptionLabel={(option) => option.metadata.name}
        value={accounts.find(a => a.metadata.uid === selectedAccountUid) || null}
        onChange={(_, newValue) => {
          if (newValue) {
            onSelect(newValue.metadata.uid, newValue.metadata.name);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Cloud Account *"
            required
            helperText={`${accounts.length} cloud account${accounts.length !== 1 ? 's' : ''} available for ${cloudType}`}
          />
        )}
      />
    </Box>
  );
};
