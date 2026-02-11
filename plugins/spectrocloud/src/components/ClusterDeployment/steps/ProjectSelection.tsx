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
import { SpectroCloudProject } from '../../../api/SpectroCloudApi';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  formControl: {
    marginTop: theme.spacing(2),
    width: '100%',
  },
}));

interface ProjectSelectionProps {
  selectedProjectUid?: string;
  onSelect: (projectUid: string, projectName: string) => void;
}

export const ProjectSelection = ({
  selectedProjectUid,
  onSelect,
}: ProjectSelectionProps) => {
  const classes = useStyles();
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const [projects, setProjects] = useState<SpectroCloudProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const result = await spectroCloudApi.getProjects();
        // Sort projects alphabetically
        const sortedProjects = result.sort((a, b) => 
          a.metadata.name.localeCompare(b.metadata.name)
        );
        setProjects(sortedProjects);
        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [spectroCloudApi]);

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

  return (
    <Box className={classes.root}>
      <Typography variant="h5" gutterBottom>
        Select Project
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Choose the project where you want to deploy the cluster
      </Typography>

      <Autocomplete
        options={projects}
        getOptionLabel={(option) => option.metadata.name}
        value={projects.find(p => p.metadata.uid === selectedProjectUid) || null}
        onChange={(_, newValue) => {
          if (newValue) {
            onSelect(newValue.metadata.uid, newValue.metadata.name);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Project *"
            required
            helperText={`${projects.length} project${projects.length !== 1 ? 's' : ''} available`}
          />
        )}
        renderOption={(option) => (
          <Box>
            <Typography variant="body1">{option.metadata.name}</Typography>
            {option.spec?.description && (
              <Typography variant="caption" color="textSecondary">
                {option.spec.description}
              </Typography>
            )}
          </Box>
        )}
      />
    </Box>
  );
};
