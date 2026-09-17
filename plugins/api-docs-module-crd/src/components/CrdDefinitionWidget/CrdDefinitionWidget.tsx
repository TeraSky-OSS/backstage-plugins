/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Badge,
  Box,
  Button,
  ButtonIcon,
  Card,
  Flex,
  Select,
  Text,
} from '@backstage/ui';
import { RiFileCopyLine, RiLinkM } from '@remixicon/react';
import { CodeSnippet } from '@backstage/core-components';
import yaml from 'js-yaml';
import ReactMarkdown from 'react-markdown';
import styles from './CrdDefinitionWidget.module.css';

interface CRDSchema {
  Type?: string;
  type?: string;
  Description?: string;
  description?: string;
  Properties?: Record<string, CRDSchema>;
  properties?: Record<string, CRDSchema>;
  Items?: {
    Schema: CRDSchema;
  };
  items?: CRDSchema;
  Required?: string[];
  required?: string[];
  Default?: unknown;
  default?: unknown;
  Enum?: unknown[];
  enum?: unknown[];
}

interface CRDVersion {
  name: string;
  schema: CRDSchema;
  served: boolean;
  storage: boolean;
}

interface ParsedCRDData {
  Kind: string;
  Group: string;
  Version: string;
  Schema: CRDSchema;
  versions?: CRDVersion[];
}

function getDescription(schema: CRDSchema): string {
  return schema.Description?.trim() || schema.description?.trim() || '_No Description Provided._';
}

/**
 * Collapses the two schema key casings this widget accepts into one canonical
 * shape. The simplified format uses capitalised keys (Type, Properties, …) and
 * the Kubernetes openAPIV3Schema format uses lowercase ones; every consumer
 * reads the capitalised fields returned here.
 */
function normalizeSchema(schema: CRDSchema): CRDSchema {
  return {
    Type: schema.Type || schema.type,
    Description: schema.Description || schema.description,
    Properties: schema.Properties || schema.properties,
    Items: schema.Items || (schema.items ? { Schema: schema.items } : undefined),
    Required: schema.Required || schema.required,
    // Select by key presence, not ??, so a falsy default (false, 0, "") and an
    // explicitly configured `Default: null` are both preserved rather than
    // being treated as absent and dropped.
    Default: Object.prototype.hasOwnProperty.call(schema, 'Default')
      ? schema.Default
      : schema.default,
    Enum: schema.Enum ?? schema.enum,
  };
}

/**
 * Renders a schema default for display. Strings are shown verbatim (an empty
 * string as `""`, so it is not mistaken for "no default"); everything else is
 * JSON-encoded. Returns undefined when no default is set.
 */
function formatDefault(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value === '' ? '""' : value;
  return JSON.stringify(value);
}

function parseCRDData(data: any): ParsedCRDData | null {
  // Check if it's the simplified format
  if (data.Kind && data.Group && data.Version) {
    return {
      Kind: data.Kind,
      Group: data.Group,
      Version: data.Version,
      Schema: data.Schema ? normalizeSchema(data.Schema) : { Type: 'object' },
    };
  }
  
  // Check if it's a Kubernetes CRD format
  if (data.apiVersion?.includes('apiextensions.k8s.io') && data.kind === 'CustomResourceDefinition') {
    const group = data.spec?.group;
    const kind = data.spec?.names?.kind;
    
    // Parse all versions
    const rawVersions = data.spec?.versions || [];
    const parsedVersions: CRDVersion[] = rawVersions.map((v: any) => ({
      name: v.name,
      schema: v.schema?.openAPIV3Schema ? normalizeSchema(v.schema.openAPIV3Schema) : { Type: 'object' },
      served: v.served || false,
      storage: v.storage || false,
    }));
    
    // Find the default version (storage version or first served version)
    const defaultVersion = parsedVersions.find(v => v.storage) || 
                          parsedVersions.find(v => v.served) || 
                          parsedVersions[0];
    
    if (!group || !kind || !defaultVersion) {
      return null;
    }
    
    return {
      Kind: kind,
      Group: group,
      Version: defaultVersion.name,
      Schema: defaultVersion.schema,
      versions: parsedVersions.length > 1 ? parsedVersions : undefined,
    };
  }
  
  return null;
}

/**
 * Generate an example Custom Resource YAML from the CRD schema
 * Similar to kubectl-creyaml functionality
 */
function generateExampleYAML(
  kind: string,
  group: string,
  version: string,
  schema: CRDSchema | null,
): string {
  if (!schema) {
    return `apiVersion: ${group}/${version}
kind: ${kind}
metadata:
  name: ""
  annotations: {}
spec: {}
`;
  }

  const normalizedSchema = normalizeSchema(schema);
  const allProperties = normalizedSchema?.Properties || {};
  
  // Check if there's a spec property in the schema (typical for CRDs)
  // If so, use its properties as the spec content
  let properties: Record<string, CRDSchema>;
  
  if (allProperties.spec) {
    const specSchema = normalizeSchema(allProperties.spec);
    properties = specSchema?.Properties || {};
  } else {
    // Otherwise, filter out top-level Kubernetes fields
    properties = { ...allProperties };
    delete properties.apiVersion;
    delete properties.kind;
    delete properties.metadata;
    delete properties.status;
  }

  // Generate the spec section recursively
  const generateProperties = (
    props: Record<string, CRDSchema>, 
    indent: number = 0,
  ): string => {
    const indentStr = '  '.repeat(indent);
    let result = '';

    Object.entries(props).forEach(([key, prop]) => {
      const normalizedProp = normalizeSchema(prop);
      const type = normalizedProp?.Type?.toLowerCase();
      const propProperties = normalizedProp?.Properties;

      if (type === 'object' && propProperties && Object.keys(propProperties).length > 0) {
        result += `${indentStr}${key}:\n`;
        result += generateProperties(propProperties, indent + 1);
      } else if (type === 'array') {
        const items = normalizedProp?.Items;
        if (items) {
          // Items can have a Schema property or be a direct schema
          const itemSchema = items.Schema || items;
          const itemsNormalized = normalizeSchema(itemSchema);
          const itemType = itemsNormalized?.Type?.toLowerCase();
          const itemProperties = itemsNormalized?.Properties;
          
          if (itemType === 'object' && itemProperties && Object.keys(itemProperties).length > 0) {
            result += `${indentStr}${key}:\n`;
            result += `${indentStr}  - `;
            const itemPropEntries = Object.entries(itemProperties);
            if (itemPropEntries.length > 0) {
              // First property goes on the same line as the dash
              const [firstKey, firstProp] = itemPropEntries[0];
              const firstNormalized = normalizeSchema(firstProp);
              const firstType = firstNormalized?.Type?.toLowerCase();
              result += `${firstKey}: ${firstType || 'string'}\n`;
              
              // Remaining properties are indented under the dash
              for (let i = 1; i < itemPropEntries.length; i++) {
                const [propKey, propVal] = itemPropEntries[i];
                const propNormalized = normalizeSchema(propVal);
                const propType = propNormalized?.Type?.toLowerCase();
                const propProps = propNormalized?.Properties;
                
                if (propType === 'object' && propProps && Object.keys(propProps).length > 0) {
                  result += `${indentStr}    ${propKey}:\n`;
                  result += generateProperties(propProps, indent + 3);
                } else {
                  result += `${indentStr}    ${propKey}: ${propType || 'string'}\n`;
                }
              }
            }
          } else {
            // For simple array types, show empty array
            result += `${indentStr}${key}: []\n`;
          }
        } else {
          result += `${indentStr}${key}: []\n`;
        }
      } else {
        result += `${indentStr}${key}: ${type || 'string'}\n`;
      }
    });

    return result;
  };

  const specContent = generateProperties(properties, 1);

  return `apiVersion: ${group}/${version}
kind: ${kind}
metadata:
  name: ""
  annotations: {}
spec:
${specContent}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

interface SchemaPartProps {
  propertyKey: string;
  property: CRDSchema;
  parent?: CRDSchema;
  parentSlug?: string;
  expandAll: boolean;
  collapseAll: boolean;
}

/**
 * Renders a single schema property as an expandable accordion: its name, type,
 * required flag, default and enum allowed values, description, and, recursively,
 * any nested object or array-item properties.
 */
const SchemaPart: React.FC<SchemaPartProps> = ({
  propertyKey,
  property,
  parent,
  parentSlug,
  expandAll,
  collapseAll,
}) => {
  const [props, propKeys, required, type, schema, defaultValue, enumValues] =
    useMemo(() => {
      const normalized = normalizeSchema(property);
      let currentSchema = normalized;
      let currentProps = normalized.Properties || {};
      let currentType = normalized.Type || 'string';

      if (currentType === 'array' && normalized.Items?.Schema) {
        const itemsSchema = normalizeSchema(normalized.Items.Schema);
        if (itemsSchema.Type !== 'object') {
          currentType = `[]${itemsSchema.Type}`;
        } else {
          currentSchema = itemsSchema;
          currentProps = itemsSchema.Properties || {};
          currentType = '[]object';
        }
      }

      const currentPropKeys = Object.keys(currentProps);
      const normalizedParent = parent ? normalizeSchema(parent) : undefined;
      const isRequired =
        normalizedParent?.Required?.includes(propertyKey) || false;

      // Default and enum belong to the property itself, so read them from the
      // property's own schema rather than the array item schema resolved above.
      const propDefault = formatDefault(normalized.Default);
      const propEnum = normalized.Enum?.map(v =>
        typeof v === 'string' ? v : JSON.stringify(v),
      );

      return [
        currentProps,
        currentPropKeys,
        isRequired,
        currentType,
        currentSchema,
        propDefault,
        propEnum,
      ] as const;
    }, [parent, property, propertyKey]);

  const slug = useMemo(
    () => slugify((parentSlug ? `${parentSlug}-` : '') + propertyKey),
    [parentSlug, propertyKey],
  );

  const isHyperlinked = useCallback(
    () => window.location.hash.substring(1).startsWith(slug),
    [slug],
  );

  const [isOpen, setIsOpen] = useState(
    (propertyKey === 'spec' && !parent) || isHyperlinked(),
  );

  useEffect(() => {
    const handleHashChange = () => {
      if (!isOpen && isHyperlinked()) {
        setIsOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isOpen, isHyperlinked]);

  useEffect(() => {
    if (expandAll) {
      setIsOpen(true);
    }
  }, [expandAll]);

  useEffect(() => {
    if (collapseAll) {
      setIsOpen(false);
    }
  }, [collapseAll]);

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.hash = `#${slug}`;
    navigator.clipboard.writeText(url.toString());
  };

  return (
    <Box style={{ position: 'relative', marginTop: 'var(--bui-space-2)' }}>
      <Accordion isExpanded={isOpen} onExpandedChange={setIsOpen}>
        <AccordionTrigger>
          <Flex align="center" gap="2" style={{ flexWrap: 'wrap', paddingRight: 'var(--bui-space-8)' }}>
            <Text weight="bold">{propertyKey}</Text>
            <Badge className={styles.typeChip}>{type}</Badge>
            {required && <Badge className={styles.requiredChip}>required</Badge>}
            {defaultValue !== undefined && (
              <Badge className={styles.defaultChip}>{`default: ${defaultValue}`}</Badge>
            )}
          </Flex>
        </AccordionTrigger>
        <AccordionPanel>
          <Flex direction="column" gap="3">
            <Box id={slug} className={styles.description}>
              <ReactMarkdown>{getDescription(property)}</ReactMarkdown>
            </Box>
            {enumValues && enumValues.length > 0 && (
              <Flex align="center" gap="1" style={{ flexWrap: 'wrap' }}>
                <Text variant="body-small" color="secondary">
                  Allowed values:
                </Text>
                {enumValues.map(value => (
                  <Badge key={value} className={styles.enumChip}>{value}</Badge>
                ))}
              </Flex>
            )}
            {propKeys.length > 0 && (
              <Box>
                {propKeys.map(propKey => (
                  <SchemaPart
                    key={propKey}
                    propertyKey={propKey}
                    property={props[propKey]}
                    parent={schema}
                    parentSlug={slug}
                    expandAll={expandAll}
                    collapseAll={collapseAll}
                  />
                ))}
              </Box>
            )}
          </Flex>
        </AccordionPanel>
      </Accordion>
      <ButtonIcon
        aria-label="Copy link to this property"
        icon={<RiLinkM />}
        size="small"
        variant="tertiary"
        style={{ position: 'absolute', top: 'var(--bui-space-2)', right: 'var(--bui-space-8)' }}
        onPress={handleCopyLink}
      />
    </Box>
  );
};

interface PartLabelProps {
  type: string;
  value: string;
}

const PartLabel: React.FC<PartLabelProps> = ({ type, value }) => {
  return (
    <Box style={{ textAlign: 'center' }}>
      <Text variant="title-medium" weight="bold">{value}</Text>
      <Text
        as="div"
        variant="body-x-small"
        color="secondary"
        style={{ textTransform: 'uppercase' }}
      >
        {type}
      </Text>
    </Box>
  );
};

export interface CrdDefinitionWidgetProps {
  definition: string;
}

export const CrdDefinitionWidget: React.FC<CrdDefinitionWidgetProps> = ({
  definition,
}) => {
  const [expandAll, setExpandAll] = useState(false);
  const [collapseAll, setCollapseAll] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const crdData = useMemo(() => {
    try {
      const parsed = yaml.load(definition);
      return parseCRDData(parsed);
    } catch (error) {
      return null;
    }
  }, [definition]);

  // State for selected version (only used when multiple versions exist)
  const [selectedVersion, setSelectedVersion] = useState<string>('');

  // Initialize selected version when crdData changes
  useEffect(() => {
    if (crdData?.versions && !selectedVersion) {
      setSelectedVersion(crdData.Version);
    }
  }, [crdData, selectedVersion]);

  const handleExpandAll = () => {
    setCollapseAll(false);
    setExpandAll(prev => !prev);
  };

  const handleCollapseAll = () => {
    setExpandAll(false);
    setCollapseAll(prev => !prev);
  };

  if (!crdData) {
    return (
      <Card style={{ padding: 'var(--bui-space-4)' }}>
        <Text style={{ color: 'var(--bui-fg-negative)' }}>
          Failed to parse CRD definition
        </Text>
      </Card>
    );
  }

  const { Kind, Group, versions } = crdData;
  
  // Determine which version to display
  const currentVersion = selectedVersion || crdData.Version;
  const currentVersionData = versions?.find(v => v.name === currentVersion) || {
    name: crdData.Version,
    schema: crdData.Schema,
    served: true,
    storage: false,
  };
  
  const Version = currentVersionData.name;
  const Schema = currentVersionData.schema;
  
  // Handler for copying example YAML to clipboard
  const handleCopyExampleYAML = async () => {
    const exampleYAML = generateExampleYAML(Kind, Group, Version, Schema);
    
    try {
      await navigator.clipboard.writeText(exampleYAML);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = exampleYAML;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackErr) {
        // Silently fail - clipboard operations may not be supported
      }
      document.body.removeChild(textArea);
    }
  };
  
  // Handle case where Schema might be undefined
  const normalizedSchema = Schema ? normalizeSchema(Schema) : null;
  const properties = normalizedSchema?.Properties ? { ...normalizedSchema.Properties } : null;

  // Remove standard Kubernetes fields
  if (properties?.apiVersion) delete properties.apiVersion;
  if (properties?.kind) delete properties.kind;
  if (properties?.metadata) {
    const metadataSchema = normalizeSchema(properties.metadata);
    if (metadataSchema.Type === 'object') delete properties.metadata;
  }

  const propertyKeys = properties ? Object.keys(properties) : [];

  return (
    <Box style={{ padding: 'var(--bui-space-4)' }}>
      <Box mb="5">
        <Flex
          justify="between"
          align="start"
          gap="4"
          mb="4"
          direction="row"
          style={{ flexWrap: 'wrap' }}
        >
          <PartLabel type="Kind" value={Kind} />
          <PartLabel type="Group" value={Group} />
          <Box>
            <PartLabel type="Version" value={Version} />
            {currentVersionData.storage && (
              <Badge style={{ marginLeft: 'var(--bui-space-2)' }}>storage</Badge>
            )}
            {currentVersionData.served && (
              <Badge style={{ marginLeft: 'var(--bui-space-2)' }}>served</Badge>
            )}
          </Box>
        </Flex>

        {versions && versions.length > 1 && (
          <Box mb="4" style={{ maxWidth: 300 }}>
            <Select
              label="Select Version"
              selectedKey={selectedVersion || crdData.Version}
              onSelectionChange={key => setSelectedVersion(key as string)}
              options={versions.map(v => {
                let suffix = '';
                if (v.storage) {
                  suffix = ' (storage)';
                } else if (v.served) {
                  suffix = ' (served)';
                }
                return { id: v.name, label: `${v.name}${suffix}` };
              })}
            />
          </Box>
        )}

        <Box my="4">
          <CodeSnippet
            text={`apiVersion: ${Group}/${Version}\nkind: ${Kind}`}
            language="yaml"
            showLineNumbers={false}
            showCopyCodeButton
          />
        </Box>

        {Schema && (
          <Box my="4" className={styles.description}>
            <ReactMarkdown>{getDescription(Schema)}</ReactMarkdown>
          </Box>
        )}
      </Box>

      {propertyKeys.length > 0 ? (
        <>
          <Flex
            justify="between"
            gap="2"
            mb="4"
            direction="row"
            style={{ flexWrap: 'wrap' }}
          >
            <Button
              variant="secondary"
              size="small"
              iconStart={<RiFileCopyLine />}
              onPress={handleCopyExampleYAML}
            >
              {copySuccess ? 'Copied!' : 'Copy Example YAML'}
            </Button>
            <Flex gap="2">
              <Button onPress={handleCollapseAll} variant="secondary" size="small">
                - collapse all
              </Button>
              <Button onPress={handleExpandAll} variant="secondary" size="small">
                + expand all
              </Button>
            </Flex>
          </Flex>
          <Box>
            {propertyKeys.map(propKey => (
              <SchemaPart
                key={propKey}
                propertyKey={propKey}
                property={properties![propKey]}
                expandAll={expandAll}
                collapseAll={collapseAll}
              />
            ))}
          </Box>
        </>
      ) : (
        <Card style={{ padding: 'var(--bui-space-6)', textAlign: 'center' }}>
          <Text variant="title-small" color="secondary">
            This CRD has an empty or unspecified schema.
          </Text>
        </Card>
      )}
    </Box>
  );
};
