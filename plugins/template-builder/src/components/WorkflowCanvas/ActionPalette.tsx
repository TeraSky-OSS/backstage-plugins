import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import SearchIcon from '@material-ui/icons/Search';
import type { AvailableAction } from '../../types';

const useStyles = makeStyles(theme => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  searchBox: {
    marginBottom: theme.spacing(1),
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing(1),
  },
  listItem: {
    cursor: 'grab',
    '&:active': {
      cursor: 'grabbing',
    },
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  category: {
    margin: 0,
  },
  emptyState: {
    padding: theme.spacing(3),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));

export interface ActionPaletteProps {
  actions: AvailableAction[];
  onActionDragStart: (action: AvailableAction) => void;
}

export function ActionPalette(props: ActionPaletteProps) {
  const { actions, onActionDragStart } = props;
  const classes = useStyles();
  const [searchQuery, setSearchQuery] = useState('');

  const categorizedActions = useMemo(() => {
    const filtered = actions.filter(
      action =>
        action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categories = new Map<string, AvailableAction[]>();
    
    filtered.forEach(action => {
      const category = action.category || 'Other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(action);
    });

    return Array.from(categories.entries()).map(([name, actions]) => ({
      name,
      actions,
    }));
  }, [actions, searchQuery]);

  const handleDragStart = (action: AvailableAction) => (event: React.DragEvent) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(action));
    onActionDragStart(action);
  };

  return (
    <Paper className={classes.root}>
      <Box className={classes.header}>
        <Typography variant="h6" gutterBottom>
          Actions
        </Typography>
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder="Search actions..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={classes.searchBox}
          InputProps={{
            startAdornment: <SearchIcon color="action" />,
          }}
        />
        <Typography variant="caption" color="textSecondary">
          Drag actions to the canvas
        </Typography>
      </Box>

      <Box className={classes.content}>
        {categorizedActions.length > 0 ? (
          categorizedActions.map(category => (
            <Accordion key={category.name} defaultExpanded className={classes.category}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">
                  {category.name}
                  <Chip
                    label={category.actions.length}
                    size="small"
                    style={{ marginLeft: 8, height: 18 }}
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails style={{ padding: 0 }}>
                <List dense style={{ width: '100%' }}>
                  {category.actions.map(action => (
                    <ListItem
                      key={action.id}
                      className={classes.listItem}
                      draggable
                      onDragStart={handleDragStart(action)}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap>
                            {action.name}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="textSecondary" noWrap>
                            {action.id}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))
        ) : (
          <Box className={classes.emptyState}>
            <Typography variant="body2">
              {searchQuery ? 'No actions found' : 'Loading actions...'}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
