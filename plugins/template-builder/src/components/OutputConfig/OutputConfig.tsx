import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import type { OutputLink } from '../../types';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  emptyState: {
    padding: theme.spacing(3),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));

export interface OutputConfigProps {
  links?: OutputLink[];
  onUpdateLinks: (links: OutputLink[]) => void;
}

export function OutputConfig(props: OutputConfigProps) {
  const { links = [], onUpdateLinks } = props;
  const classes = useStyles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentLink, setCurrentLink] = useState<OutputLink>({
    title: '',
    url: '',
  });

  const handleAddClick = () => {
    setCurrentLink({ title: '', url: '' });
    setEditingIndex(null);
    setDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    setCurrentLink(links[index]);
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const newLinks = [...links];
    if (editingIndex !== null) {
      newLinks[editingIndex] = currentLink;
    } else {
      newLinks.push(currentLink);
    }
    onUpdateLinks(newLinks);
    setDialogOpen(false);
  };

  const handleDelete = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    onUpdateLinks(newLinks);
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.section}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle2">Output Links</Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
            variant="outlined"
          >
            Add Link
          </Button>
        </Box>

        {links.length > 0 ? (
          <List dense>
            {links.map((link, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={link.title || 'Untitled Link'}
                  secondary={link.url}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleEditClick(index)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleDelete(index)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box className={classes.emptyState}>
            <Typography variant="body2">
              No output links configured. Add links to show after template execution.
            </Typography>
          </Box>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingIndex !== null ? 'Edit Output Link' : 'Add Output Link'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={currentLink.title || ''}
            onChange={e => setCurrentLink({ ...currentLink, title: e.target.value })}
            margin="dense"
            variant="outlined"
            placeholder="Repository"
          />
          <TextField
            fullWidth
            label="URL"
            value={currentLink.url || ''}
            onChange={e => setCurrentLink({ ...currentLink, url: e.target.value })}
            margin="dense"
            variant="outlined"
            placeholder="${{ steps.publish.output.remoteUrl }}"
            helperText="Use ${{ }} expressions to reference step outputs"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Icon (optional)"
            value={currentLink.icon || ''}
            onChange={e => setCurrentLink({ ...currentLink, icon: e.target.value })}
            margin="dense"
            variant="outlined"
            placeholder="github"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
