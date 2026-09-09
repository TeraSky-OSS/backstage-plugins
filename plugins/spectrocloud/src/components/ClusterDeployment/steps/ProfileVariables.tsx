import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Alert,
  Badge,
  Box,
  Flex,
  Grid,
  PasswordField,
  Select,
  Switch,
  TextAreaField,
  TextField,
  Text,
} from '@backstage/ui';
import { Progress } from '@backstage/core-components';
import { RiStackLine } from '@remixicon/react';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { ProfileSelection } from '../types';
import styles from './ProfileVariables.module.css';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <Progress />
      </Flex>
    );
  }

  if (error) {
    return (
      <Box p="4">
        <Alert status="danger" description={error} />
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
    const isMissingRequired = Boolean(variable.required && !value);
    const label = `${variable.displayName || variable.name}${variable.required ? ' *' : ''}`;

    if (hasOptions) {
      return (
        <Box style={{ width: '100%' }}>
          <Select
            label={label}
            description={variable.description}
            isRequired={variable.required}
            selectedKey={value === '' ? '' : String(value)}
            onSelectionChange={key => {
              handleVariableChange(variable.name, key === '' || key === null ? '' : String(key));
            }}
            options={[
              ...(!variable.required ? [{ id: '', label: 'None' }] : []),
              ...(variable.options ?? []).map(option => {
                const optionValue = typeof option === 'object' ? option.value : option;
                const optionLabel = typeof option === 'object' && option.label ? option.label : optionValue;
                return { id: optionValue, label: optionLabel };
              }),
            ]}
          />
          {isMissingRequired && (
            <Text variant="body-small" style={{ color: 'var(--bui-fg-negative)' }}>
              This field is required
            </Text>
          )}
        </Box>
      );
    }

    if (isBoolean) {
      return (
        <Switch
          label={variable.displayName || variable.name}
          isSelected={value === 'true' || value === true}
          onChange={isSelected => handleVariableChange(variable.name, isSelected ? 'true' : 'false')}
          isDisabled={variable.immutable}
        />
      );
    }

    const commonProps = {
      label,
      description: variable.description,
      value: String(value),
      isRequired: variable.required,
      isInvalid: isMissingRequired,
      placeholder: variable.defaultValue,
      isDisabled: variable.immutable,
    };

    if (isMultiline) {
      return (
        <TextAreaField
          {...commonProps}
          rows={4}
          onChange={val => handleVariableChange(variable.name, val)}
        />
      );
    }

    const handleTextChange = (val: string) => {
      if (isNumber) {
        // For number fields, only allow valid numeric input
        if (val === '') {
          handleVariableChange(variable.name, '');
        } else if (/^-?\d*\.?\d*$/.test(val)) {
          // Valid number format (allows partial input like "1.", "-", "1.2")
          handleVariableChange(variable.name, val);
        }
        // Invalid input is ignored
      } else {
        handleVariableChange(variable.name, val);
      }
    };

    const handleTextBlur = () => {
      // Convert to actual number on blur for number fields
      if (isNumber && value !== '') {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          handleVariableChange(variable.name, numValue);
        }
      }
    };

    if (isSensitive) {
      return (
        <PasswordField
          {...commonProps}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
        />
      );
    }

    return (
      <TextField
        {...commonProps}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
      />
    );
  };

  if (profileVariablesGroups.length === 0) {
    return (
      <Box p="4">
        <Text variant="title-small" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
          Profile Variables
        </Text>
        <Alert status="info" description="No variables are defined for the selected profiles. Click Next to continue." />
      </Box>
    );
  }

  return (
    <Box p="4">
      <Text variant="title-small" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
        Profile Variables
      </Text>
      <Text variant="body-medium" color="secondary" style={{ display: 'block', marginBottom: 'var(--bui-space-4)' }}>
        Provide values for the variables defined in your selected profiles.
      </Text>

      <Flex direction="column" gap="2">
        {profileVariablesGroups.map((group, groupIdx) => (
          <Accordion key={groupIdx} defaultExpanded>
            <AccordionTrigger>
              <Flex align="center" gap="2">
                <RiStackLine size={18} className={styles.profileIcon} />
                <Text weight="bold" className={styles.profileTitle}>
                  {group.profile.name} {group.profile.version}
                </Text>
                <Badge>
                  {`${group.variables.length} variable${group.variables.length !== 1 ? 's' : ''}`}
                </Badge>
              </Flex>
            </AccordionTrigger>
            <AccordionPanel>
              <Grid.Root columns="12" gap="4">
                {group.variables.map(variable => (
                  <Grid.Item colSpan={{ xs: '12', sm: '6' }} key={variable.name}>
                    {renderVariableInput(variable)}
                  </Grid.Item>
                ))}
              </Grid.Root>
            </AccordionPanel>
          </Accordion>
        ))}
      </Flex>
    </Box>
  );
};
