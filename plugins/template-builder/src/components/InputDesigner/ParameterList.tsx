import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import DeleteIcon from '@material-ui/icons/Delete';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import type { ParameterStep } from '../../types';

const useStyles = makeStyles(theme => ({
  paper: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  scrollableContent: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0, // Important: allows flex child to shrink
  },
  header: {
    padding: theme.spacing(2),
  },
  fieldsList: {
    borderTop: `1px solid ${theme.palette.divider}`,
    paddingTop: theme.spacing(1),
  },
  listItem: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  selectedItem: {
    backgroundColor: theme.palette.action.selected,
  },
  fieldType: {
    marginLeft: theme.spacing(1),
  },
  emptyState: {
    padding: theme.spacing(3),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));

export interface ParameterListProps {
  step: ParameterStep;
  stepIndex: number;
  selectedField?: string;
  onSelectField: (fieldName: string) => void;
  onDeleteField: (fieldName: string) => void;
  onUpdateStep: (updates: Partial<ParameterStep>) => void;
}

export function ParameterList(props: ParameterListProps) {
  const { step, selectedField, onSelectField, onDeleteField, onUpdateStep } = props;
  const classes = useStyles();

  const fields = Object.entries(step.properties);
  const isRequired = (fieldName: string) => step.required.includes(fieldName);

  return (
    <Paper className={classes.paper}>
      <Box className={classes.scrollableContent}>
        <Box className={classes.header}>
        <TextField
          fullWidth
          label="Step Title"
          value={step.title}
          onChange={e => onUpdateStep({ title: e.target.value })}
          variant="outlined"
          size="small"
          margin="dense"
        />
        <TextField
          fullWidth
          label="Description"
          value={step.description || ''}
          onChange={e => onUpdateStep({ description: e.target.value })}
          variant="outlined"
          size="small"
          margin="dense"
          multiline
          rows={2}
        />

        <Box mt={1}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Conditional Fields (dependencies)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box width="100%">
                <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                  Use JSON Schema dependencies to show/hide fields based on other field values.
                  Example: Show field B only when field A has a specific value.
                </Typography>
                <Typography variant="caption" color="textSecondary" component="div" gutterBottom>
                  <strong>Example structure:</strong>
                  <pre style={{ fontSize: 10, marginTop: 4 }}>
{`{
  "fieldName": {
    "oneOf": [
      {
        "properties": {
          "fieldName": { "enum": ["value1"] }
        }
      },
      {
        "properties": {
          "fieldName": { "enum": ["value2"] },
          "conditionalField": {
            "type": "string",
            "title": "Only shown when value2"
          }
        },
        "required": ["conditionalField"]
      }
    ]
  }
}`}
                  </pre>
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  maxRows={20}
                  value={step.dependencies ? JSON.stringify(step.dependencies, null, 2) : '{}'}
                  onChange={e => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      onUpdateStep({ dependencies: Object.keys(parsed).length > 0 ? parsed : undefined });
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  variant="outlined"
                  placeholder="{}"
                  helperText="Enter valid JSON for conditional field dependencies"
                  style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}
                  InputProps={{
                    style: { maxHeight: 'none' }
                  }}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
        </Box>

        <Box className={classes.fieldsList}>
          {fields.length > 0 ? (
            <List>
              {fields.map(([fieldName, field]) => (
                <ListItem
                  key={fieldName}
                  button
                  className={`${classes.listItem} ${
                    selectedField === fieldName ? classes.selectedItem : ''
                  }`}
                  onClick={() => onSelectField(fieldName)}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2">{field.title}</Typography>
                        {isRequired(fieldName) && (
                          <Chip
                            label="Required"
                            size="small"
                            color="primary"
                            style={{ marginLeft: 8, height: 20 }}
                          />
                        )}
                        <Chip
                          label={field.uiField || field.type}
                          size="small"
                          variant="outlined"
                          className={classes.fieldType}
                          style={{ height: 20 }}
                        />
                      </Box>
                    }
                    secondary={field.description}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteField(fieldName);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box className={classes.emptyState}>
              <Typography variant="body2">
                No fields defined. Click "Add Field" to create one.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
