import React, { useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  FormControl,
  Chip,
  Button,
  ButtonGroup,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CodeIcon from '@material-ui/icons/Code';
import TextFieldsIcon from '@material-ui/icons/TextFields';
import FunctionsIcon from '@material-ui/icons/Functions';
import { VariablePicker, Variable } from './VariablePicker';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  modeSelector: {
    marginBottom: theme.spacing(1),
  },
  expressionPreview: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(1),
    backgroundColor: theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius,
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    wordBreak: 'break-all',
  },
}));

type ExpressionMode = 'static' | 'variable' | 'expression';

export interface ExpressionBuilderProps {
  value?: any;
  onChange: (value: any) => void;
  availableVariables: Variable[];
  propertyType?: string | string[];
}

export function ExpressionBuilder(props: ExpressionBuilderProps) {
  const { value, onChange, availableVariables, propertyType } = props;
  const classes = useStyles();

  // Determine mode from value
  const getInitialMode = (): ExpressionMode => {
    if (typeof value === 'string') {
      if (value.startsWith('${{') && value.endsWith('}}')) {
        const inner = value.slice(3, -2).trim();
        // Check if it's a simple variable reference
        if (/^[a-zA-Z0-9._]+$/.test(inner)) {
          return 'variable';
        }
        return 'expression';
      }
    }
    return 'static';
  };

  const [mode, setMode] = useState<ExpressionMode>(getInitialMode());

  const handleModeChange = (newMode: ExpressionMode) => {
    setMode(newMode);
    
    // Clear value when changing modes
    if (newMode === 'static') {
      onChange('');
    } else if (newMode === 'variable') {
      onChange('');
    } else if (newMode === 'expression') {
      onChange('${{  }}');
    }
  };

  const handleStaticChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // Try to parse based on property type
    if (propertyType === 'number' || propertyType === 'integer') {
      const parsed = parseFloat(newValue);
      onChange(isNaN(parsed) ? newValue : parsed);
    } else if (propertyType === 'boolean') {
      onChange(newValue.toLowerCase() === 'true');
    } else {
      onChange(newValue);
    }
  };

  const handleVariableSelect = (variableValue: string) => {
    onChange(variableValue);
  };

  const handleExpressionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const renderInput = () => {
    switch (mode) {
      case 'static':
        return (
          <TextField
            fullWidth
            value={value || ''}
            onChange={handleStaticChange}
            placeholder="Enter a static value..."
            variant="outlined"
            size="small"
            type={propertyType === 'number' || propertyType === 'integer' ? 'number' : 'text'}
          />
        );

      case 'variable':
        return (
          <>
            <VariablePicker
              variables={availableVariables}
              value={value}
              onChange={handleVariableSelect}
              placeholder="Select a variable..."
            />
            {value && (
              <Box className={classes.expressionPreview}>
                <Typography variant="caption" color="textSecondary">
                  Expression:
                </Typography>
                <Typography variant="body2">{value}</Typography>
              </Box>
            )}
          </>
        );

      case 'expression':
        return (
          <>
            <TextField
              fullWidth
              value={value || '${{  }}'}
              onChange={handleExpressionChange}
              placeholder="${{ expression }}"
              variant="outlined"
              size="small"
              multiline
              rows={2}
              helperText="Use ${{ }} syntax for expressions"
            />
            <Box mt={1}>
              <Typography variant="caption" color="textSecondary" gutterBottom>
                Quick insert:
              </Typography>
              <Box display="flex" flexWrap="wrap" style={{ gap: 4 }}>
                {availableVariables.slice(0, 5).map(variable => (
                  <Chip
                    key={variable.value}
                    label={variable.label}
                    size="small"
                    onClick={() => {
                      // Insert at cursor or append
                      onChange(variable.value);
                    }}
                  />
                ))}
              </Box>
            </Box>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Box className={classes.root}>
      <ButtonGroup size="small" className={classes.modeSelector}>
        <Button
          variant={mode === 'static' ? 'contained' : 'outlined'}
          onClick={() => handleModeChange('static')}
        >
          <TextFieldsIcon fontSize="small" style={{ marginRight: 4 }} />
          Static
        </Button>
        <Button
          variant={mode === 'variable' ? 'contained' : 'outlined'}
          onClick={() => handleModeChange('variable')}
        >
          <FunctionsIcon fontSize="small" style={{ marginRight: 4 }} />
          Variable
        </Button>
        <Button
          variant={mode === 'expression' ? 'contained' : 'outlined'}
          onClick={() => handleModeChange('expression')}
        >
          <CodeIcon fontSize="small" style={{ marginRight: 4 }} />
          Expression
        </Button>
      </ButtonGroup>

      <FormControl fullWidth>
        {renderInput()}
      </FormControl>
    </Box>
  );
}
