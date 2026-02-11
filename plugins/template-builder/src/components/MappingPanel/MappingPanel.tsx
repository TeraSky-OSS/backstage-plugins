import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { ExpressionBuilder } from './ExpressionBuilder';
import type { ActionNodeData, ParameterStep, PropertySchema } from '../../types';

const useStyles = makeStyles(theme => ({
  root: {
    height: '100%',
    overflow: 'auto',
  },
  header: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  content: {
    padding: theme.spacing(2),
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  inputField: {
    marginBottom: theme.spacing(2),
  },
  emptyState: {
    padding: theme.spacing(4),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));

export interface MappingPanelProps {
  action: ActionNodeData;
  actionSchema?: {
    input?: {
      properties?: Record<string, PropertySchema>;
      required?: string[];
    };
  };
  parameters: ParameterStep[];
  previousSteps: Array<{ id: string; name: string }>;
  onUpdateInputs: (inputs: Record<string, any>) => void;
}

export function MappingPanel(props: MappingPanelProps) {
  const { action, actionSchema, parameters, previousSteps, onUpdateInputs } = props;
  const classes = useStyles();

  const inputProperties = actionSchema?.input?.properties || {};
  const requiredInputs = actionSchema?.input?.required || [];

  const handleInputChange = (inputName: string, value: any) => {
    const newInputs = { ...action.inputs, [inputName]: value };
    onUpdateInputs(newInputs);
  };

  const availableVariables = React.useMemo(() => {
    const vars: Array<{ label: string; value: string; group: string }> = [];

    // Add parameters
    parameters.forEach(step => {
      Object.keys(step.properties).forEach(fieldName => {
        vars.push({
          label: `parameters.${fieldName}`,
          value: `\${{ parameters.${fieldName} }}`,
          group: 'Parameters',
        });
      });
    });

    // Add previous step outputs
    previousSteps.forEach(step => {
      vars.push({
        label: `steps.${step.id}.output`,
        value: `\${{ steps.${step.id}.output }}`,
        group: 'Step Outputs',
      });
    });

    // Add built-in variables
    vars.push(
      {
        label: 'user.entity.metadata.name',
        value: '\${{ user.entity.metadata.name }}',
        group: 'Built-in',
      },
      {
        label: 'user.ref',
        value: '\${{ user.ref }}',
        group: 'Built-in',
      }
    );

    return vars;
  }, [parameters, previousSteps]);

  if (Object.keys(inputProperties).length === 0) {
    return (
      <Paper className={classes.root}>
        <Box className={classes.header}>
          <Typography variant="h6">{action.name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {action.actionId}
          </Typography>
        </Box>
        <Box className={classes.emptyState}>
          <Typography variant="body2">
            This action has no configurable inputs
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper className={classes.root}>
      <Box className={classes.header}>
        <Typography variant="h6">{action.name}</Typography>
        <Typography variant="caption" color="textSecondary">
          {action.actionId}
        </Typography>
      </Box>

      <Box className={classes.content}>
        {Object.entries(inputProperties).map(([inputName, schema]) => {
          const isRequired = requiredInputs.includes(inputName);
          const currentValue = action.inputs?.[inputName];

          return (
            <Box key={inputName} className={classes.inputField}>
              <Typography variant="subtitle2" gutterBottom>
                {schema.title || inputName}
                {isRequired && <span style={{ color: 'red' }}> *</span>}
              </Typography>
              {schema.description && (
                <Typography variant="caption" color="textSecondary" paragraph>
                  {schema.description}
                </Typography>
              )}

              <ExpressionBuilder
                value={currentValue}
                onChange={value => handleInputChange(inputName, value)}
                availableVariables={availableVariables}
                propertyType={schema.type}
              />

              <Divider style={{ marginTop: 16 }} />
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
