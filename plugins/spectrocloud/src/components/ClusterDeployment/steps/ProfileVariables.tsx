import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormControlLabel,
  Switch,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import LayersIcon from '@material-ui/icons/Layers';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { ProfileSelection } from '../types';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  formControl: {
    width: '100%',
  },
  profileSection: {
    marginBottom: theme.spacing(2),
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  profileIcon: {
    color: theme.palette.primary.main,
  },
  profileTitle: {
    fontWeight: 600,
    fontSize: '1.1rem',
  },
  variablesContent: {
    padding: theme.spacing(2),
  },
  accordion: {
    marginBottom: theme.spacing(1),
    '&:before': {
      display: 'none',
    },
  },
  accordionSummary: {
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
    '&.Mui-expanded': {
      minHeight: 48,
    },
  },
  accordionDetails: {
    padding: theme.spacing(2),
    display: 'block',
  },
}));

interface ProfileVariablesProps {
  profiles: ProfileSelection[];
  projectUid: string;
  profileVariables: Record<string, any>;
  onUpdate: (updates: { 
    profileVariables: Record<string, any>; 
    profileVariablesByProfile?: Record<string, string[]>;
  }) => void;
  onValidationChange?: (isValid: boolean) => void;
}

interface Variable {
  name: string;
  displayName?: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
  format?: string; // string, number, boolean, ipv4, ipv4cidr, ipv6, version, base64
  inputType?: string; // text, dropdown, multiline
  regex?: string;
  immutable?: boolean;
  isSensitive?: boolean;
  options?: Array<{
    value: string;
    label?: string;
    default?: boolean;
  }>;
  hidden?: boolean;
}

interface ProfileVariablesGroup {
  profile: ProfileSelection;
  variables: Variable[];
}

export const ProfileVariables = ({
  profiles,
  projectUid,
  profileVariables,
  onUpdate,
  onValidationChange,
}: ProfileVariablesProps) => {
  const classes = useStyles();
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [profileVariablesGroups, setProfileVariablesGroups] = useState<ProfileVariablesGroup[]>([]);

  // Validate required variables whenever variables or values change
  useEffect(() => {
    if (!onValidationChange) return;
    
    // Collect all required variables from all profiles
    const allRequiredVars: Variable[] = [];
    profileVariablesGroups.forEach(group => {
      allRequiredVars.push(...group.variables.filter(v => v.required));
    });
    
    const isValid = allRequiredVars.every(v => {
      const value = profileVariables[v.name];
      // Check if value exists and is not empty
      if (value === undefined || value === null || value === '') {
        return false;
      }
      // For number fields, ensure it's actually a valid number
      if (v.format === 'number') {
        const numValue = typeof value === 'number' ? value : Number(value);
        return !isNaN(numValue);
      }
      return true;
    });
    
    onValidationChange(isValid);
  }, [profileVariablesGroups, profileVariables, onValidationChange]);

  useEffect(() => {
    const fetchAllProfileVariables = async () => {
      try {
        setLoading(true);
        const groups: ProfileVariablesGroup[] = [];
        const variableMapping: Record<string, string[]> = {};

        // Fetch variables for all profiles, keeping them grouped
        for (const profile of profiles) {
          const result = await spectroCloudApi.getProfileVariables(
            profile.versionUid || profile.uid,
            projectUid
          );

          if (result.variables && Array.isArray(result.variables)) {
            const visibleVariables = result.variables.filter((v: Variable) => !v.hidden);
            
            // Only add profile group if it has visible variables
            if (visibleVariables.length > 0) {
              groups.push({
                profile,
                variables: visibleVariables,
              });
              
              // Store which variables belong to this profile
              variableMapping[profile.uid] = visibleVariables.map((v: Variable) => v.name);
            }
          }
        }

        setProfileVariablesGroups(groups);
        
        // Update parent with the profile-to-variables mapping
        onUpdate({
          profileVariables,
          profileVariablesByProfile: variableMapping,
        });
        
        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile variables');
      } finally {
        setLoading(false);
      }
    };

    if (profiles.length > 0) {
      fetchAllProfileVariables();
    } else {
      setLoading(false);
      setProfileVariablesGroups([]);
    }
  }, [spectroCloudApi, profiles, projectUid]);

  const handleVariableChange = (name: string, value: string | number | boolean) => {
    // Build the profile-to-variables mapping from current groups
    const variableMapping: Record<string, string[]> = {};
    profileVariablesGroups.forEach(group => {
      variableMapping[group.profile.uid] = group.variables.map((v: Variable) => v.name);
    });
    
    onUpdate({
      profileVariables: {
        ...profileVariables,
        [name]: value,
      },
      profileVariablesByProfile: variableMapping,
    });
  };

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

  // Helper function to render a variable input
  const renderVariableInput = (variable: Variable) => {
    const value = profileVariables[variable.name] || variable.defaultValue || '';
    
    // Determine input type based on format and inputType
    const isBoolean = variable.format === 'boolean';
    const isNumber = variable.format === 'number';
    const isSensitive = variable.isSensitive || variable.format === 'base64';
    const isMultiline = variable.inputType === 'multiline';
    const hasOptions = variable.options && variable.options.length > 0;
    
    if (hasOptions) {
      return (
        <FormControl className={classes.formControl} error={variable.required && !value}>
          <InputLabel>{variable.displayName || variable.name}{variable.required ? ' *' : ''}</InputLabel>
          <Select
            value={value}
            onChange={e => handleVariableChange(variable.name, e.target.value as string)}
            required={variable.required}
          >
            {!variable.required && (
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
            )}
            {variable.options?.map((option, idx) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' && option.label ? option.label : optionValue;
              return (
                <MenuItem key={idx} value={optionValue}>
                  {optionLabel}
                </MenuItem>
              );
            })}
          </Select>
          {variable.description && (
            <FormHelperText>{variable.description}</FormHelperText>
          )}
          {variable.required && !value && (
            <FormHelperText error>This field is required</FormHelperText>
          )}
        </FormControl>
      );
    }
    
    if (isBoolean) {
      return (
        <FormControlLabel
          control={
            <Switch
              checked={value === 'true' || value === true}
              onChange={e => handleVariableChange(variable.name, e.target.checked ? 'true' : 'false')}
              color="primary"
              disabled={variable.immutable}
            />
          }
          label={variable.displayName || variable.name}
        />
      );
    }
    
    return (
      <TextField
        label={variable.displayName || variable.name}
        value={value}
        onChange={e => {
          const rawValue = e.target.value;
          if (isNumber) {
            // For number fields, only allow valid numeric input
            if (rawValue === '') {
              handleVariableChange(variable.name, '');
            } else if (/^-?\d*\.?\d*$/.test(rawValue)) {
              // Valid number format (allows partial input like "1.", "-", "1.2")
              handleVariableChange(variable.name, rawValue);
            }
            // Invalid input is ignored
          } else {
            handleVariableChange(variable.name, rawValue);
          }
        }}
        onBlur={e => {
          // Convert to actual number on blur for number fields
          if (isNumber && e.target.value !== '') {
            const numValue = Number(e.target.value);
            if (!isNaN(numValue)) {
              handleVariableChange(variable.name, numValue);
            }
          }
        }}
        fullWidth
        required={variable.required}
        helperText={variable.description}
        placeholder={variable.defaultValue}
        disabled={variable.immutable}
        type={isSensitive ? 'password' : 'text'}
        multiline={isMultiline}
        rows={isMultiline ? 4 : 1}
        InputProps={{
          inputProps: {
            pattern: isNumber ? '^-?\\d*\\.?\\d+$' : variable.regex,
            inputMode: isNumber ? 'decimal' : undefined,
          },
        }}
        error={variable.required && !value && value !== 0}
      />
    );
  };

  if (profileVariablesGroups.length === 0) {
    return (
      <Box className={classes.root}>
        <Typography variant="h5" gutterBottom>
          Profile Variables
        </Typography>
        <Alert severity="info">
          No variables are defined for the selected profiles. Click Next to continue.
        </Alert>
      </Box>
    );
  }

  return (
    <Box className={classes.root}>
      <Typography variant="h5" gutterBottom>
        Profile Variables
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Provide values for the variables defined in your selected profiles.
      </Typography>

      {profileVariablesGroups.map((group, groupIdx) => (
        <Accordion
          key={groupIdx}
          defaultExpanded
          className={classes.accordion}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            className={classes.accordionSummary}
          >
            <Box display="flex" alignItems="center">
              <LayersIcon className={classes.profileIcon} />
              <Typography className={classes.profileTitle} style={{ marginLeft: 8 }}>
                {group.profile.name} {group.profile.version}
              </Typography>
              <Chip 
                label={`${group.variables.length} variable${group.variables.length !== 1 ? 's' : ''}`} 
                size="small" 
                color="primary"
                style={{ marginLeft: 8 }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails className={classes.accordionDetails}>
            <Grid container spacing={3}>
              {group.variables.map(variable => (
                <Grid item xs={12} md={6} key={variable.name}>
                  {renderVariableInput(variable)}
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};
