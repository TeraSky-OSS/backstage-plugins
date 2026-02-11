import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemText,
  InputAdornment,
  Box,
  Chip,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import SearchIcon from '@material-ui/icons/Search';
import type { AvailableAction } from '../../types';

const useStyles = makeStyles(theme => ({
  dialogContent: {
    padding: 0,
    height: 500,
    display: 'flex',
    flexDirection: 'column',
  },
  searchBox: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  listContainer: {
    flex: 1,
    overflow: 'auto',
  },
  listItem: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  categoryChip: {
    marginLeft: theme.spacing(1),
  },
}));

export interface AddActionDialogProps {
  open: boolean;
  actions: AvailableAction[];
  onClose: () => void;
  onSelectAction: (action: AvailableAction) => void;
}

export function AddActionDialog(props: AddActionDialogProps) {
  const { open, actions, onClose, onSelectAction } = props;
  const classes = useStyles();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActions = useMemo(() => {
    if (!searchQuery) return actions;
    
    const query = searchQuery.toLowerCase();
    return actions.filter(
      action =>
        action.name.toLowerCase().includes(query) ||
        action.id.toLowerCase().includes(query) ||
        action.description?.toLowerCase().includes(query) ||
        action.category?.toLowerCase().includes(query)
    );
  }, [actions, searchQuery]);

  const handleSelect = (action: AvailableAction) => {
    onSelectAction(action);
    setSearchQuery('');
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Workflow Step</DialogTitle>
      <DialogContent className={classes.dialogContent}>
        <Box className={classes.searchBox}>
          <TextField
            fullWidth
            placeholder="Search actions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            autoFocus
          />
        </Box>
        
        <Box className={classes.listContainer}>
          {filteredActions.length > 0 ? (
            <List>
              {filteredActions.map(action => (
                <ListItem
                  key={action.id}
                  className={classes.listItem}
                  onClick={() => handleSelect(action)}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        <Typography variant="body1">{action.name}</Typography>
                        {action.category && (
                          <Chip
                            label={action.category}
                            size="small"
                            className={classes.categoryChip}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" display="block" color="textSecondary">
                          {action.id}
                        </Typography>
                        {action.description && (
                          <Typography variant="body2" color="textSecondary">
                            {action.description}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box p={3} textAlign="center">
              <Typography variant="body2" color="textSecondary">
                No actions found matching "{searchQuery}"
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
