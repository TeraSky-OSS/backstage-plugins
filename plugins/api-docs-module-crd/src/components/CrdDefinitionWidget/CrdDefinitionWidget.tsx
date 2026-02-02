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
import { makeStyles } from '@material-ui/core/styles';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import LinkIcon from '@material-ui/icons/Link';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import { CodeSnippet } from '@backstage/core-components';
import yaml from 'js-yaml';
import ReactMarkdown from 'react-markdown';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  labelContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(2),
    gap: theme.spacing(2),
    flexWrap: 'wrap',
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column',
    },
  },
  labelItem: {
    textAlign: 'center',
  },
  labelValue: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  labelType: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
  },
  apiVersionSnippet: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  description: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    fontSize: '1.125rem',
    '& p': {
      margin: 0,
    },
  },
  accordionSummary: {
    backgroundColor: theme.palette.background.default,
    minHeight: 56,
    '&.Mui-expanded': {
      minHeight: 56,
    },
  },
  accordionDetails: {
    flexDirection: 'column',
    padding: theme.spacing(2),
  },
  propertyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },
  typeChip: {
    fontFamily: 'monospace',
    backgroundColor: theme.palette.type === 'dark' 
      ? theme.palette.grey[800] 
      : theme.palette.grey[200],
    color: theme.palette.text.primary,
    fontWeight: 500,
  },
  requiredChip: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  linkButton: {
    marginLeft: 'auto',
    minWidth: 'auto',
    padding: theme.spacing(0.5),
  },
  nestedAccordion: {
    marginTop: theme.spacing(1),
    '&:before': {
      display: 'none',
    },
  },
  expandButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column',
    },
  },
  copyExampleButton: {
    [theme.breakpoints.down('sm')]: {
      width: '100%',
    },
  },
  emptySchema: {
    padding: theme.spacing(3),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  versionSelector: {
    minWidth: 200,
    marginBottom: theme.spacing(2),
  },
  versionBadge: {
    marginLeft: theme.spacing(1),
  },
}));

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

function normalizeSchema(schema: CRDSchema): CRDSchema {
  return {
    Type: schema.Type || schema.type,
    Description: schema.Description || schema.description,
    Properties: schema.Properties || schema.properties,
    Items: schema.Items || (schema.items ? { Schema: schema.items } : undefined),
    Required: schema.Required || schema.required,
  };
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

const SchemaPart: React.FC<SchemaPartProps> = ({
  propertyKey,
  property,
  parent,
  parentSlug,
  expandAll,
  collapseAll,
}) => {
  const classes = useStyles();

  const [props, propKeys, required, type, schema] = useMemo(() => {
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
    const isRequired = normalizedParent?.Required?.includes(propertyKey) || false;

    return [currentProps, currentPropKeys, isRequired, currentType, currentSchema];
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
    <Accordion
      expanded={isOpen}
      onChange={(_, expanded) => setIsOpen(expanded)}
      className={classes.nestedAccordion}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        className={classes.accordionSummary}
      >
        <Box className={classes.propertyHeader}>
          <Typography variant="body1" style={{ fontWeight: 500 }}>
            {propertyKey}
          </Typography>
          <Chip
            label={type}
            size="small"
            className={classes.typeChip}
          />
          {required && (
            <Chip
              label="required"
              size="small"
              className={classes.requiredChip}
            />
          )}
          <Button
            size="small"
            className={classes.linkButton}
            onClick={e => {
              e.stopPropagation();
              handleCopyLink();
            }}
          >
            <LinkIcon fontSize="small" />
          </Button>
        </Box>
      </AccordionSummary>
      <AccordionDetails className={classes.accordionDetails}>
        <Box id={slug} className={classes.description}>
          <ReactMarkdown>{getDescription(property)}</ReactMarkdown>
        </Box>
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
      </AccordionDetails>
    </Accordion>
  );
};

interface PartLabelProps {
  type: string;
  value: string;
}

const PartLabel: React.FC<PartLabelProps> = ({ type, value }) => {
  const classes = useStyles();

  return (
    <Box className={classes.labelItem}>
      <Typography className={classes.labelValue}>{value}</Typography>
      <Typography className={classes.labelType}>{type}</Typography>
    </Box>
  );
};

export interface CrdDefinitionWidgetProps {
  definition: string;
}

export const CrdDefinitionWidget: React.FC<CrdDefinitionWidgetProps> = ({
  definition,
}) => {
  const classes = useStyles();
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
      <Paper className={classes.root}>
        <Typography color="error">Failed to parse CRD definition</Typography>
      </Paper>
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
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Grid container spacing={2} className={classes.labelContainer}>
          <Grid item>
            <PartLabel type="Kind" value={Kind} />
          </Grid>
          <Grid item>
            <PartLabel type="Group" value={Group} />
          </Grid>
          <Grid item>
            <Box>
              <PartLabel type="Version" value={Version} />
              {currentVersionData.storage && (
                <Chip
                  label="storage"
                  size="small"
                  color="primary"
                  className={classes.versionBadge}
                />
              )}
              {currentVersionData.served && (
                <Chip
                  label="served"
                  size="small"
                  color="secondary"
                  className={classes.versionBadge}
                />
              )}
            </Box>
          </Grid>
        </Grid>

        {versions && versions.length > 1 && (
          <FormControl className={classes.versionSelector} variant="outlined" size="small">
            <InputLabel id="version-select-label">Select Version</InputLabel>
            <Select
              labelId="version-select-label"
              value={selectedVersion || crdData.Version}
              onChange={e => setSelectedVersion(e.target.value as string)}
              label="Select Version"
            >
              {versions.map(v => (
                <MenuItem key={v.name} value={v.name}>
                  {v.name}
                  {v.storage && ' (storage)'}
                  {v.served && !v.storage && ' (served)'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Box className={classes.apiVersionSnippet}>
          <CodeSnippet
            text={`apiVersion: ${Group}/${Version}\nkind: ${Kind}`}
            language="yaml"
            showLineNumbers={false}
            showCopyCodeButton
          />
        </Box>

        {Schema && (
          <Box className={classes.description}>
            <ReactMarkdown>{getDescription(Schema)}</ReactMarkdown>
          </Box>
        )}
      </Box>

      {propertyKeys.length > 0 ? (
        <>
          <Box className={classes.expandButtons}>
            <Button 
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<FileCopyIcon />}
              onClick={handleCopyExampleYAML}
              className={classes.copyExampleButton}
            >
              {copySuccess ? 'Copied!' : 'Copy Example YAML'}
            </Button>
            <Box style={{ display: 'flex', gap: 8 }}>
              <Button onClick={handleCollapseAll} variant="outlined" size="small">
                - collapse all
              </Button>
              <Button onClick={handleExpandAll} variant="outlined" size="small">
                + expand all
              </Button>
            </Box>
          </Box>
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
        <Paper className={classes.emptySchema}>
          <Typography variant="h6">
            This CRD has an empty or unspecified schema.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};
