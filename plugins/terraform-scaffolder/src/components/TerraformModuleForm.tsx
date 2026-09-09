import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { Progress } from '@backstage/core-components';
import { Alert, Flex, Select } from '@backstage/ui';
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
  const api = useApi(terraformScaffolderApiRef);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modules, setModules] = useState<TerraformModuleReference[]>([]);
  const [schema, setSchema] = useState<ExtendedRJSFSchema | null>(null);
  const [selectedModule, setSelectedModule] = useState<TerraformModuleReference | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>('');

  useEffect(() => {
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

  useEffect(() => {
    const fetchVariables = async () => {
      if (!formData?.module || !selectedVersion) {
        setSchema(null);
        return;
      }

      const moduleRef = modules.find(m => m.name === formData.module);
      if (!moduleRef) return;

      try {
        setLoading(true);
        const vars = await api.getModuleVariables(moduleRef, selectedVersion);
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
  }, [api, formData?.module, modules, selectedVersion]);

  const handleModuleChange = useCallback(async (moduleName: string) => {
    const moduleRef = modules.find(m => m.name === moduleName);
    
    if (moduleRef) {
      setLoading(true);
      try {
        // If it's a registry module, fetch all versions
        // eslint-disable-next-line no-console
        console.log('moduleRef', JSON.stringify(moduleRef, null, 2));
        let versions = moduleRef.refs || [];
        if (moduleRef.isRegistryModule) {
          versions = await api.getModuleVersions(moduleRef);
        }
        
        // Set the latest version as default
        const latestVersion = versions.length > 0 ? versions[0] : 'main';
        setSelectedVersion(latestVersion);
        
        // Update the module reference with the fetched versions
        moduleRef.refs = versions;
        
        onChange({
          module: moduleName,
          moduleUrl: moduleRef.url || '',
          moduleRef: latestVersion,
          variables: {},
          variableDefinitions: '',
        });
      } catch (err) {
        setError('Failed to fetch module versions');
      } finally {
        setLoading(false);
      }
    }
  }, [onChange, modules, api]);

  const handleVersionChange = useCallback((version: string) => {
    setSelectedVersion(version);
    
    if (selectedModule) {
      onChange({
        ...formData,
        moduleRef: version,
        variables: {},
        variableDefinitions: '',
      });
    }
  }, [onChange, selectedModule, formData]);

  const handleChange = useCallback((data: { formData?: Record<string, unknown> }) => {
    if (data.formData && selectedModule) {
      // Get the original variables.tf content from the schema's originalDefinition
      const variableDefinitions = (schema as ExtendedRJSFSchema)?.originalDefinition;
      
      onChange({
        ...formData,
        module: selectedModule.name,
        moduleUrl: selectedModule.url,
        moduleRef: selectedVersion,
        variables: data.formData,
        variableDefinitions: variableDefinitions || '',
      });
    }
  }, [onChange, formData, selectedModule, schema, selectedVersion]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <Alert status="danger" description={error} />;
  }

  const selectedModuleRef = modules.find(m => m.name === formData?.module);
  const availableVersions = selectedModuleRef?.refs || [];

  return (
    <Flex direction="column" gap="4" mt="4">
      <Select
        label="Terraform Module"
        selectedKey={formData?.module || null}
        onSelectionChange={key => handleModuleChange(key as string)}
        options={modules.map(module => ({ id: module.name, label: module.name }))}
      />

      {formData?.module && availableVersions.length > 0 && (
        <Select
          label="Version"
          selectedKey={selectedVersion || null}
          onSelectionChange={key => handleVersionChange(key as string)}
          options={availableVersions.map(version => ({ id: version, label: version }))}
        />
      )}

      {schema && formData?.module && selectedVersion && (
        <Form
          schema={schema}
          formData={formData.variables}
          onChange={handleChange}
          validator={validator}
          liveValidate
          showErrorList={false}
          children // This hides the submit button
        />
      )}
    </Flex>
  );
};