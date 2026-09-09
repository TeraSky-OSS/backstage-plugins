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
import { ManagedResourceDefinition } from '@terasky/backstage-plugin-crossplane-common';
import { default as React } from 'react';
import styles from './MrdDefinitionWidget.module.css';

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
    <Box style={{ position: 'relative', marginTop: 'var(--bui-space-2)' }}>
      <Accordion isExpanded={isOpen} onExpandedChange={setIsOpen}>
        <AccordionTrigger>
          <Flex align="center" gap="2" style={{ flexWrap: 'wrap', paddingRight: 'var(--bui-space-8)' }}>
            <Text weight="bold">{propertyKey}</Text>
            <Badge className={styles.typeChip}>{type}</Badge>
            {required && <Badge className={styles.requiredChip}>required</Badge>}
          </Flex>
        </AccordionTrigger>
        <AccordionPanel>
          <Flex direction="column" gap="3">
            {getDescription(property) && (
              <Box id={slug}>
                <Text variant="body-small" color="secondary">
                  {getDescription(property)}
                </Text>
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

// ─── PartLabel ───────────────────────────────────────────────────────────────

const PartLabel: React.FC<{ type: string; value: string }> = ({ type, value }) => {
  return (
    <Box style={{ textAlign: 'center' }}>
      <Text variant="title-medium" weight="bold">{value}</Text>
      <Text as="div" variant="body-x-small" color="secondary" style={{ textTransform: 'uppercase' }}>
        {type}
      </Text>
    </Box>
  );
};

// ─── Main widget ─────────────────────────────────────────────────────────────

export interface MrdDefinitionWidgetProps {
  mrd: ManagedResourceDefinition;
}

export const MrdDefinitionWidget: React.FC<MrdDefinitionWidgetProps> = ({ mrd }) => {
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
      <Card style={{ padding: 'var(--bui-space-4)' }}>
        <Text style={{ color: 'var(--bui-fg-negative)' }}>Failed to parse ManagedResourceDefinition</Text>
      </Card>
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
    <Box style={{ padding: 'var(--bui-space-4)' }}>
      {/* ── Header ── */}
      <Box mb="5">
        <Flex justify="between" align="start" gap="4" mb="4" direction="row" style={{ flexWrap: 'wrap' }}>
          <PartLabel type="Kind" value={kind} />
          <PartLabel type="Group" value={group} />
          <PartLabel type="Scope" value={scope} />
          <Box style={{ textAlign: 'center' }}>
            <Badge className={state === 'Active' ? styles.stateChipActive : styles.stateChipInactive}>
              {state}
            </Badge>
            <Text as="div" variant="body-x-small" color="secondary" style={{ textTransform: 'uppercase', marginTop: 'var(--bui-space-1)' }}>
              State
            </Text>
          </Box>
        </Flex>

        {/* Version selector when more than one version */}
        {versions.length > 1 && (
          <Box mb="4" style={{ maxWidth: '300px' }}>
            <Select
              label="Select Version"
              selectedKey={currentVersion}
              onSelectionChange={key => setSelectedVersion(String(key))}
              options={versions.map(v => {
                let suffix = '';
                if (v.referenceable) {
                  suffix = ' (referenceable)';
                } else if (v.served) {
                  suffix = ' (served)';
                }
                return { id: v.name, label: `${v.name}${suffix}` };
              })}
            />
          </Box>
        )}

        {/* apiVersion/kind snippet */}
        <Box my="4">
          <CodeSnippet
            text={`apiVersion: ${group}/${currentVersion}\nkind: ${kind}`}
            language="yaml"
            showLineNumbers={false}
            showCopyCodeButton
          />
        </Box>

        {/* Top-level schema description */}
        {getDescription(schema) && (
          <Box my="4">
            <Text variant="body-small" color="secondary">
              {getDescription(schema)}
            </Text>
          </Box>
        )}
      </Box>

      {/* ── Schema tree ── */}
      {propertyKeys.length > 0 ? (
        <>
          <Flex justify="between" gap="2" mb="4" direction="row" style={{ flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="small"
              iconStart={<RiFileCopyLine />}
              onPress={handleCopyExampleYAML}
            >
              {copySuccess ? 'Copied!' : 'Copy Example YAML'}
            </Button>
            <Flex gap="2">
              <Button
                onPress={() => { setExpandAll(false); setCollapseAll(prev => !prev); }}
                variant="secondary"
                size="small"
              >
                − collapse all
              </Button>
              <Button
                onPress={() => { setCollapseAll(false); setExpandAll(prev => !prev); }}
                variant="secondary"
                size="small"
              >
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
        <Card className={styles.emptySchema}>
          <Text variant="title-small">This MRD has an empty or unspecified schema.</Text>
        </Card>
      )}
    </Box>
  );
};

export default MrdDefinitionWidget;
