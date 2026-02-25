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
import { ManagedResourceDefinition } from '@terasky/backstage-plugin-crossplane-common';
import { default as React } from 'react';

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
    fontSize: '1.4rem',
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
    fontSize: '1rem',
  },
  accordionSummary: {
    backgroundColor: theme.palette.background.default,
    minHeight: 48,
    '&.Mui-expanded': {
      minHeight: 48,
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
    backgroundColor:
      theme.palette.type === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
    color: theme.palette.text.primary,
    fontWeight: 500,
    fontSize: '11px',
  },
  requiredChip: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontSize: '11px',
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
  stateChipActive: {
    backgroundColor:
      theme.palette.type === 'dark' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)',
    color: theme.palette.type === 'dark' ? '#81c784' : '#2e7d32',
    fontWeight: 'bold',
  },
  stateChipInactive: {
    backgroundColor:
      theme.palette.type === 'dark' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)',
    color: theme.palette.type === 'dark' ? '#e57373' : '#c62828',
    fontWeight: 'bold',
  },
  scopeChipNamespaced: {
    backgroundColor:
      theme.palette.type === 'dark' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.1)',
    color: theme.palette.type === 'dark' ? '#64b5f6' : '#1565c0',
    fontWeight: 'bold',
  },
  scopeChipCluster: {
    backgroundColor:
      theme.palette.type === 'dark' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)',
    color: theme.palette.type === 'dark' ? '#ffb74d' : '#e65100',
    fontWeight: 'bold',
  },
}));

// ─── Schema types (mirrors CrdDefinitionWidget internals) ────────────────────

interface MRDSchema {
  type?: string;
  description?: string;
  properties?: Record<string, MRDSchema>;
  items?: MRDSchema;
  required?: string[];
  [key: string]: any;
}

interface MRDVersion {
  name: string;
  schema: MRDSchema;
  served: boolean;
  referenceable: boolean;
}

interface ParsedMRDData {
  kind: string;
  group: string;
  scope: string;
  state: string;
  plural: string;
  defaultVersion: string;
  versions: MRDVersion[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDescription(schema: MRDSchema): string {
  return schema.description?.trim() || '';
}

function parseMRD(mrd: ManagedResourceDefinition): ParsedMRDData | null {
  const group = mrd.spec?.group;
  const kind = mrd.spec?.names?.kind;
  const plural = mrd.spec?.names?.plural;
  const scope = mrd.spec?.scope ?? 'Cluster';
  const state = mrd.spec?.state ?? 'Unknown';

  if (!group || !kind) return null;

  const rawVersions = mrd.spec?.versions ?? [];
  const versions: MRDVersion[] = rawVersions.map(v => ({
    name: v.name,
    schema: v.schema?.openAPIV3Schema ?? { type: 'object' },
    served: v.served ?? false,
    referenceable: v.referenceable ?? false,
  }));

  // Pick default: referenceable first, then first served, then first
  const defaultVersion =
    versions.find(v => v.referenceable) ??
    versions.find(v => v.served) ??
    versions[0];

  if (!defaultVersion && rawVersions.length === 0) {
    // No versions declared — synthesise a placeholder so we can still render
    versions.push({ name: 'v1alpha1', schema: { type: 'object' }, served: true, referenceable: true });
  }

  return {
    kind,
    group,
    scope,
    state,
    plural: plural ?? '',
    defaultVersion: (defaultVersion ?? versions[0])?.name ?? 'v1alpha1',
    versions,
  };
}

function generateExampleYAML(
  kind: string,
  group: string,
  version: string,
  schema: MRDSchema | null,
): string {
  if (!schema) {
    return `apiVersion: ${group}/${version}\nkind: ${kind}\nmetadata:\n  name: ""\nspec: {}\n`;
  }

  const allProperties = schema.properties ?? {};
  let properties: Record<string, MRDSchema>;

  if (allProperties.spec) {
    properties = allProperties.spec.properties ?? {};
  } else {
    properties = { ...allProperties };
    delete properties.apiVersion;
    delete properties.kind;
    delete properties.metadata;
    delete properties.status;
  }

  const generateProperties = (props: Record<string, MRDSchema>, indent = 0): string => {
    const pad = '  '.repeat(indent);
    let result = '';
    Object.entries(props).forEach(([key, prop]) => {
      const t = prop.type?.toLowerCase();
      const pp = prop.properties;
      if (t === 'object' && pp && Object.keys(pp).length > 0) {
        result += `${pad}${key}:\n`;
        result += generateProperties(pp, indent + 1);
      } else if (t === 'array') {
        const itemProps = prop.items?.properties;
        if (itemProps && Object.keys(itemProps).length > 0) {
          result += `${pad}${key}:\n${pad}  - `;
          const entries = Object.entries(itemProps);
          result += `${entries[0][0]}: ${entries[0][1].type ?? 'string'}\n`;
          for (let i = 1; i < entries.length; i++) {
            result += `${pad}    ${entries[i][0]}: ${entries[i][1].type ?? 'string'}\n`;
          }
        } else {
          result += `${pad}${key}: []\n`;
        }
      } else {
        result += `${pad}${key}: ${t ?? 'string'}\n`;
      }
    });
    return result;
  };

  return `apiVersion: ${group}/${version}\nkind: ${kind}\nmetadata:\n  name: ""\nspec:\n${generateProperties(
    properties,
    1,
  )}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

// ─── SchemaPart ──────────────────────────────────────────────────────────────

interface SchemaPartProps {
  propertyKey: string;
  property: MRDSchema;
  parent?: MRDSchema;
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
    let currentSchema: MRDSchema = property;
    let currentProps: Record<string, MRDSchema> = property.properties ?? {};
    let currentType = property.type ?? 'string';

    if (currentType === 'array' && property.items) {
      const items = property.items;
      if (items.type !== 'object') {
        currentType = `[]${items.type ?? 'string'}`;
      } else {
        currentSchema = items;
        currentProps = items.properties ?? {};
        currentType = '[]object';
      }
    }

    const isRequired = parent?.required?.includes(propertyKey) ?? false;
    return [currentProps, Object.keys(currentProps), isRequired, currentType, currentSchema];
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
      if (!isOpen && isHyperlinked()) setIsOpen(true);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isOpen, isHyperlinked]);

  useEffect(() => {
    if (expandAll) setIsOpen(true);
  }, [expandAll]);

  useEffect(() => {
    if (collapseAll) setIsOpen(false);
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
      <AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.accordionSummary}>
        <Box className={classes.propertyHeader}>
          <Typography variant="body1" style={{ fontWeight: 500 }}>
            {propertyKey}
          </Typography>
          <Chip label={type} size="small" className={classes.typeChip} />
          {required && (
            <Chip label="required" size="small" className={classes.requiredChip} />
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
        {getDescription(property) && (
          <Box id={slug} className={classes.description}>
            <Typography variant="body2" color="textSecondary">
              {getDescription(property)}
            </Typography>
          </Box>
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
      </AccordionDetails>
    </Accordion>
  );
};

// ─── PartLabel ───────────────────────────────────────────────────────────────

const PartLabel: React.FC<{ type: string; value: string }> = ({ type, value }) => {
  const classes = useStyles();
  return (
    <Box className={classes.labelItem}>
      <Typography className={classes.labelValue}>{value}</Typography>
      <Typography className={classes.labelType}>{type}</Typography>
    </Box>
  );
};

// ─── Main widget ─────────────────────────────────────────────────────────────

export interface MrdDefinitionWidgetProps {
  mrd: ManagedResourceDefinition;
}

export const MrdDefinitionWidget: React.FC<MrdDefinitionWidgetProps> = ({ mrd }) => {
  const classes = useStyles();
  const [expandAll, setExpandAll] = useState(false);
  const [collapseAll, setCollapseAll] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState('');

  const parsed = useMemo(() => parseMRD(mrd), [mrd]);

  useEffect(() => {
    if (parsed && !selectedVersion) {
      setSelectedVersion(parsed.defaultVersion);
    }
  }, [parsed, selectedVersion]);

  if (!parsed) {
    return (
      <Paper className={classes.root}>
        <Typography color="error">Failed to parse ManagedResourceDefinition</Typography>
      </Paper>
    );
  }

  const { kind, group, scope, state, versions } = parsed;
  const currentVersion = selectedVersion || parsed.defaultVersion;
  const currentVersionData =
    versions.find(v => v.name === currentVersion) ?? versions[0];
  const schema: MRDSchema = currentVersionData?.schema ?? { type: 'object' };

  const properties = schema.properties ? { ...schema.properties } : null;
  if (properties?.apiVersion) delete properties.apiVersion;
  if (properties?.kind) delete properties.kind;
  if (properties?.metadata && properties.metadata.type === 'object') {
    delete properties.metadata;
  }
  const propertyKeys = properties ? Object.keys(properties) : [];

  const handleCopyExampleYAML = async () => {
    const exampleYaml = generateExampleYAML(kind, group, currentVersion, schema);
    try {
      await navigator.clipboard.writeText(exampleYaml);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = exampleYaml;
      ta.style.position = 'fixed';
      ta.style.left = '-999999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch { /* silent */ }
      document.body.removeChild(ta);
    }
  };

  return (
    <Box className={classes.root}>
      {/* ── Header ── */}
      <Box className={classes.header}>
        <Grid container spacing={2} className={classes.labelContainer}>
          <Grid item>
            <PartLabel type="Kind" value={kind} />
          </Grid>
          <Grid item>
            <PartLabel type="Group" value={group} />
          </Grid>
          <Grid item>
            <Box className={classes.labelItem}>
              <Typography className={classes.labelValue}>{scope}</Typography>
              <Typography className={classes.labelType}>Scope</Typography>
            </Box>
          </Grid>
          <Grid item>
            <Box className={classes.labelItem}>
              <Box display="flex" alignItems="center" justifyContent="center">
                <Chip
                  label={state}
                  size="small"
                  className={
                    state === 'Active' ? classes.stateChipActive : classes.stateChipInactive
                  }
                />
              </Box>
              <Typography className={classes.labelType} style={{ marginTop: 4 }}>
                State
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Version selector when more than one version */}
        {versions.length > 1 && (
          <FormControl
            className={classes.versionSelector}
            variant="outlined"
            size="small"
          >
            <InputLabel id="mrd-version-select-label">Select Version</InputLabel>
            <Select
              labelId="mrd-version-select-label"
              value={currentVersion}
              onChange={e => setSelectedVersion(e.target.value as string)}
              label="Select Version"
            >
              {versions.map(v => (
                <MenuItem key={v.name} value={v.name}>
                  {v.name}
                  {v.referenceable && ' (referenceable)'}
                  {v.served && !v.referenceable && ' (served)'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* apiVersion/kind snippet */}
        <Box className={classes.apiVersionSnippet}>
          <CodeSnippet
            text={`apiVersion: ${group}/${currentVersion}\nkind: ${kind}`}
            language="yaml"
            showLineNumbers={false}
            showCopyCodeButton
          />
        </Box>

        {/* Top-level schema description */}
        {getDescription(schema) && (
          <Box className={classes.description}>
            <Typography variant="body2" color="textSecondary">
              {getDescription(schema)}
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Schema tree ── */}
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
              <Button
                onClick={() => { setExpandAll(false); setCollapseAll(prev => !prev); }}
                variant="outlined"
                size="small"
              >
                − collapse all
              </Button>
              <Button
                onClick={() => { setCollapseAll(false); setExpandAll(prev => !prev); }}
                variant="outlined"
                size="small"
              >
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
            This MRD has an empty or unspecified schema.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default MrdDefinitionWidget;
