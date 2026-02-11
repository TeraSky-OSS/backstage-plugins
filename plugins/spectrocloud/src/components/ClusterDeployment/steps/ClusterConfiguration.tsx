import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Grid,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  section: {
    marginTop: theme.spacing(3),
  },
  labelItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  labelInput: {
    marginRight: theme.spacing(1),
  },
}));

interface ClusterConfigurationProps {
  clusterName: string;
  clusterDescription?: string;
  clusterTags: string[];
  clusterVariables: Record<string, any>;
  onUpdate: (updates: {
    clusterName?: string;
    clusterDescription?: string;
    clusterTags?: string[];
    clusterVariables?: Record<string, any>;
  }) => void;
}

export const ClusterConfiguration = ({
  clusterName,
  clusterDescription,
  clusterTags,
  onUpdate,
}: ClusterConfigurationProps) => {
  const classes = useStyles();
  const [tags, setTags] = React.useState<string[]>(clusterTags || []);

  const handleAddTag = () => {
    setTags([...tags, '']);
  };

  const handleRemoveTag = (index: number) => {
    const updated = [...tags];
    updated.splice(index, 1);
    setTags(updated);
    updateTags(updated);
  };

  const handleTagChange = (index: number, value: string) => {
    const updated = [...tags];
    updated[index] = value;
    setTags(updated);
    updateTags(updated);
  };

  const updateTags = (tagList: string[]) => {
    const filtered = tagList.filter(tag => tag.trim() !== '');
    onUpdate({ clusterTags: filtered });
  };

  return (
    <Box className={classes.root}>
      <Typography variant="h5" gutterBottom>
        Cluster Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Configure basic cluster settings including name, description, and tags
      </Typography>

      <TextField
        label="Cluster Name"
        value={clusterName}
        onChange={e => onUpdate({ clusterName: e.target.value })}
        fullWidth
        required
        helperText="Enter a unique name for your cluster"
        margin="normal"
      />

      <TextField
        label="Description (Optional)"
        value={clusterDescription || ''}
        onChange={e => onUpdate({ clusterDescription: e.target.value })}
        fullWidth
        multiline
        rows={3}
        helperText="Enter a description for your cluster"
        margin="normal"
      />

      <Box className={classes.section}>
        <Typography variant="h6" gutterBottom>
          Tags (Optional)
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Add tags to organize and filter your cluster
        </Typography>

        {tags.map((tag, index) => (
          <Grid container spacing={2} key={index} className={classes.labelItem}>
            <Grid item xs={10}>
              <TextField
                label="Tag Key"
                value={tag}
                onChange={e => handleTagChange(index, e.target.value)}
                fullWidth
                size="small"
                helperText="Tag keys will automatically get the value 'spectro__tag'"
              />
            </Grid>
            <Grid item xs={2}>
              <IconButton onClick={() => handleRemoveTag(index)} size="small">
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        ))}

        <Button
          startIcon={<AddIcon />}
          onClick={handleAddTag}
          size="small"
          style={{ marginTop: 8 }}
        >
          Add Tag
        </Button>
      </Box>
    </Box>
  );
};
