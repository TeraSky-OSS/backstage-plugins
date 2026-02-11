import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import type { ActionNodeData, ParameterStep, PropertySchema } from '../../types';

const useStyles = makeStyles(theme => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing(2),
  },
  inputField: {
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    fontWeight: 600,
  },
}));

export interface ActionConfigPanelProps {
  action: ActionNodeData;
  nodeId: string;
  actionSchema?: {
    input?: {
      properties?: Record<string, PropertySchema>;
      required?: string[];
    };
    output?: {
      properties?: Record<string, PropertySchema>;
    };
  };
  parameters: ParameterStep[];
  previousSteps: Array<{ id: string; name: string }>;
  onUpdateInputs: (inputs: Record<string, any>) => void;
  onUpdateName: (name: string) => void;
  onUpdateId: (id: string) => void;
  onClose: () => void;
}

export function ActionConfigPanel(props: ActionConfigPanelProps) {
  const { action, nodeId, actionSchema, parameters, previousSteps, onUpdateInputs, onUpdateName, onUpdateId, onClose } = props;
  const classes = useStyles();

  const inputProperties = actionSchema?.input?.properties || {};
  const requiredInputs = actionSchema?.input?.required || [];

  const availableVariables = [
    ...parameters.flatMap(step =>
      Object.keys(step.properties).map(fieldName => ({
        label: `parameters.${fieldName}`,
        value: `\${{ parameters.${fieldName} }}`,
      }))
    ),
    ...previousSteps.map(step => ({
      label: `steps.${step.id}.output`,
      value: `\${{ steps.${step.id}.output }}`,
    })),
  ];

  const handleInputChange = (inputName: string, value: any) => {
    const newInputs = { ...action.inputs, [inputName]: value };
    onUpdateInputs(newInputs);
  };

  return (
    <Paper className={classes.root} elevation={0} square>
      <Box className={classes.header}>
        <Box flex={1}>
          <TextField
            fullWidth
            value={action.name}
            onChange={e => onUpdateName(e.target.value)}
            variant="standard"
            placeholder="Step name"
            InputProps={{
              style: { fontSize: '1.25rem', fontWeight: 500 }
            }}
          />
          <TextField
            fullWidth
            value={nodeId}
            onChange={e => onUpdateId(e.target.value)}
            variant="standard"
            placeholder="Step ID (e.g., fetch-template)"
            InputProps={{
              style: { fontSize: '0.875rem' }
            }}
            helperText="Used to reference this step's outputs in subsequent steps"
            style={{ marginTop: 4 }}
          />
          <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 4 }}>
            Action: {action.actionId}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box className={classes.content}>
        {Object.keys(inputProperties).length > 0 ? (
          <>
            <Typography variant="subtitle2" className={classes.sectionTitle}>
              Configure Inputs
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Map values from parameters or previous steps, or enter static values.
            </Typography>

            {Object.entries(inputProperties).map(([inputName, schema]) => {
              const isRequired = requiredInputs.includes(inputName);
              const currentValue = action.inputs?.[inputName] || '';

              return (
                <Box key={inputName} className={classes.inputField}>
                  <Typography variant="subtitle2" gutterBottom>
                    {schema.title || inputName}
                    {isRequired && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  {schema.description && (
                    <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                      {schema.description}
                    </Typography>
                  )}

                  {availableVariables.length > 0 && (
                    <FormControl fullWidth size="small" margin="dense">
                      <InputLabel>Quick Select Variable</InputLabel>
                      <Select
                        value=""
                        onChange={e => handleInputChange(inputName, e.target.value)}
                      >
                        <MenuItem value="">
                          <em>Select a variable...</em>
                        </MenuItem>
                        {availableVariables.map(variable => (
                          <MenuItem key={variable.value} value={variable.value}>
                            {variable.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <TextField
                    fullWidth
                    value={currentValue}
                    onChange={e => handleInputChange(inputName, e.target.value)}
                    placeholder={schema.type === 'string' ? 'Enter value or expression' : 'Enter value'}
                    variant="outlined"
                    size="small"
                    margin="dense"
                    multiline={typeof currentValue === 'string' && currentValue.length > 50}
                    rows={typeof currentValue === 'string' && currentValue.length > 50 ? 3 : 1}
                    helperText="Use ${{ }} for expressions (e.g., ${{ parameters.name }})"
                  />

                  <Divider style={{ marginTop: 16 }} />
                </Box>
              );
            })}
          </>
        ) : (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="textSecondary">
              This action has no configurable inputs.
            </Typography>
          </Box>
        )}

        {actionSchema?.output?.properties && Object.keys(actionSchema.output.properties).length > 0 && (
          <>
            <Typography variant="subtitle2" className={classes.sectionTitle}>
              Expected Outputs
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              This action produces the following outputs that can be referenced in subsequent steps:
            </Typography>
            
            <Box mt={1} mb={2}>
              {Object.entries(actionSchema.output.properties).map(([propName, propSchema]: [string, any]) => (
                <Box key={propName} mb={1}>
                  <Typography variant="body2" style={{ fontWeight: 600 }}>
                    {propName}
                    {propSchema.type && (
                      <Typography component="span" variant="caption" color="textSecondary" style={{ marginLeft: 8 }}>
                        ({propSchema.type})
                      </Typography>
                    )}
                  </Typography>
                  {propSchema.description && (
                    <Typography variant="caption" color="textSecondary" display="block">
                      {propSchema.description}
                    </Typography>
                  )}
                  <Box mt={0.5} p={0.5} bgcolor="grey.100" borderRadius={1}>
                    <Typography variant="caption" component="code" style={{ fontFamily: 'monospace' }}>
                      {'${{ steps.' + nodeId + '.output.' + propName + ' }}'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
}
