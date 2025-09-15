import React from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { Progress } from '@backstage/core-components';
import { Alert } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core';
import { FormControl, InputLabel, Select, MenuItem } from '@material-ui/core';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { terraformScaffolderApiRef } from '../api/TerraformScaffolderApi';
import { TerraformModuleReference, TerraformVariable } from '../types';
import { TerraformModuleData } from '../plugin';
import { RJSFSchema } from '@rjsf/utils';
import { withTheme } from '@rjsf/core';

import { Theme as MuiTheme } from '@rjsf/material-ui';

import validator from '@rjsf/validator-ajv8';

interface ExtendedRJSFSchema extends RJSFSchema {
  originalDefinition?: string;
}

const Form = withTheme(MuiTheme);

const useStyles = makeStyles(theme => ({
  root: {
    marginTop: theme.spacing(2),
  },
  formControl: {
    marginBottom: theme.spacing(2),
    minWidth: 200,
    width: '100%',
  },
}));

// Convert Terraform type to JSON Schema type
function convertTerraformTypeToJsonSchema(variable: TerraformVariable): RJSFSchema {
  const type = variable.type.trim();

  // Handle list(map(string))
  if (type.startsWith('list(map(')) {
    return {
      type: 'array',
      title: variable.name,
      description: variable.description,
      items: {
        type: 'object',
        additionalProperties: true
      },
      default: variable.default || []
    };
  }

  // Handle map(list(string))
  if (type.startsWith('map(list(')) {
    return {
      type: 'object',
      title: variable.name,
      description: variable.description,
      additionalProperties: {
        type: 'array',
        items: {
          type: 'string'
        }
      },
      default: variable.default || {}
    };
  }

  // Handle list(string) or list(number)
  if (type.startsWith('list(')) {
    const innerType = type.match(/^list\((.*?)\)$/)?.[1] || 'string';
    return {
      type: 'array',
      title: variable.name,
      description: variable.description,
      items: {
        type: innerType === 'number' ? 'number' : 'string'
      },
      default: variable.default || []
    };
  }

  // Handle map(string) or map(number)
  if (type.startsWith('map(')) {
    const innerType = type.match(/^map\((.*?)\)$/)?.[1] || 'string';
    return {
      type: 'object',
      title: variable.name,
      description: variable.description,
      additionalProperties: {
        type: innerType === 'number' ? 'number' : 'string'
      },
      default: variable.default || {}
    };
  }

  // Handle set(string) or set(number)
  if (type.startsWith('set(')) {
    const innerType = type.match(/^set\((.*?)\)$/)?.[1] || 'string';
    return {
      type: 'array',
      title: variable.name,
      description: variable.description,
      uniqueItems: true,
      items: {
        type: innerType === 'number' ? 'number' : 'string'
      },
      default: variable.default || []
    };
  }

  // Handle basic types
  switch (type) {
    case 'string':
      return {
        type: 'string',
        title: variable.name,
        description: variable.description,
        default: variable.default,
      };
    case 'number':
      return {
        type: 'number',
        title: variable.name,
        description: variable.description,
        default: variable.default,
      };
    case 'bool':
      return {
        type: 'boolean',
        title: variable.name,
        description: variable.description,
        default: variable.default,
      };
    case 'list':
      return {
        type: 'array',
        title: variable.name,
        description: variable.description,
        items: { type: 'string' },
        default: variable.default || [],
      };
    case 'set':
      return {
        type: 'array',
        title: variable.name,
        description: variable.description,
        uniqueItems: true,
        items: { type: 'string' },
        default: variable.default || [],
      };
    case 'map':
      return {
        type: 'object',
        title: variable.name,
        description: variable.description,
        additionalProperties: true,
        default: variable.default || {},
      };
    default:
      return {
        type: 'string',
        title: variable.name,
        description: variable.description,
        default: variable.default,
      };
  }
}

// Convert Terraform variables to JSON Schema
function generateSchema(variables: TerraformVariable[]): ExtendedRJSFSchema {
  const schema: ExtendedRJSFSchema = {
    type: 'object',
    required: variables.filter(v => v.required).map(v => v.name),
    properties: {},
    originalDefinition: variables[0]?.originalDefinition || '',
  };

  variables.forEach(variable => {
    if (schema.properties) {
      schema.properties[variable.name] = convertTerraformTypeToJsonSchema(variable);
    }
  });

  return schema;
}

export const TerraformModuleForm = ({
  onChange,
  formData,
}: FieldExtensionComponentProps<TerraformModuleData>): JSX.Element => {
  const classes = useStyles();
  const api = useApi(terraformScaffolderApiRef);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();
  const [modules, setModules] = React.useState<TerraformModuleReference[]>([]);
  const [schema, setSchema] = React.useState<ExtendedRJSFSchema | null>(null);
  const [selectedModule, setSelectedModule] = React.useState<TerraformModuleReference | null>(null);

  React.useEffect(() => {
    const fetchModules = async () => {
      try {
        const moduleRefs = await api.getModuleReferences();
        setModules(moduleRefs);
        setError(undefined);
      } catch (err) {
        setError('Failed to load module references');
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
  }, [api]);

  React.useEffect(() => {
    const fetchVariables = async () => {
      if (!formData?.module) {
        setSchema(null);
        return;
      }

      const moduleRef = modules.find(m => m.name === formData.module);
      if (!moduleRef) return;

      try {
        setLoading(true);
        const vars = await api.getModuleVariables(moduleRef);
        setSchema(generateSchema(vars));
        setSelectedModule(moduleRef);
        setError(undefined);
      } catch (err) {
        setError('Failed to load module variables');
      } finally {
        setLoading(false);
      }
    };
    fetchVariables();
  }, [api, formData?.module, modules]);

  const handleModuleChange = React.useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    const moduleName = event.target.value as string;
    const moduleRef = modules.find(m => m.name === moduleName);
    onChange({
      module: moduleName,
      moduleUrl: moduleRef?.url || '',
      moduleRef: moduleRef?.ref || 'main',
      variables: {},
      variableDefinitions: '',
    });
  }, [onChange, modules]);

  const handleChange = React.useCallback((data: { formData?: Record<string, unknown> }) => {
    if (data.formData && selectedModule) {
      // Get the original variables.tf content from the schema's originalDefinition
      const variableDefinitions = (schema as ExtendedRJSFSchema)?.originalDefinition;
      
      onChange({
        ...formData,
        module: selectedModule.name,
        moduleUrl: selectedModule.url,
        moduleRef: selectedModule.ref || 'main',
        variables: data.formData,
        variableDefinitions: variableDefinitions || '',
      });
    }
  }, [onChange, formData, selectedModule, schema]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <div className={classes.root}>
      <FormControl className={classes.formControl}>
        <InputLabel id="module-select-label">Terraform Module</InputLabel>
        <Select
          labelId="module-select-label"
          id="module-select"
          value={formData?.module || ''}
          onChange={handleModuleChange}
        >
          {modules.map(module => (
            <MenuItem key={module.name} value={module.name}>
              {module.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {schema && formData?.module && (
        <Form
          schema={schema}
          formData={formData.variables}
          onChange={handleChange}
          validator={validator}
          liveValidate
          showErrorList={false}
          children={true} // This hides the submit button
        />
      )}
    </div>
  );
};