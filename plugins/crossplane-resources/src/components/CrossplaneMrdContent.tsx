import { useState, useEffect, useMemo } from 'react';
// BUI-EXCEPTION: `Drawer` has no BUI equivalent (see MUI_TO_BUI_MIGRATION.md exception list).
import { Drawer } from '@material-ui/core';
import {
  Badge,
  Box,
  Button,
  ButtonIcon,
  Card,
  CardBody,
  Flex,
  Select,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  TextField,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import { CopyTextButton, Progress } from '@backstage/core-components';
import {
  RiCloseLine,
  RiDownloadLine,
  RiFileTextLine,
  RiSearchLine,
} from '@remixicon/react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import {
  listManagedResourceDefinitionsPermission,
  ManagedResourceDefinition,
} from '@terasky/backstage-plugin-crossplane-common';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import yaml from 'js-yaml';
import { crossplaneApiRef } from '../api/CrossplaneApi';
import { getAnnotationPrefix } from './annotationUtils';
import { getProviderClusterName, getProviderName } from './isCrossplaneProviderEntity';
import { MrdDefinitionWidget } from './MrdDefinitionWidget';
import styles from './CrossplaneMrdContent.module.css';

const SCOPE_OPTIONS = [
  { id: 'All', label: 'All Scopes' },
  { id: 'Namespaced', label: 'Namespaced' },
  { id: 'Cluster', label: 'Cluster Scoped' },
];

const STATE_OPTIONS = [
  { id: 'All', label: 'All States' },
  { id: 'Active', label: 'Active' },
  { id: 'Inactive', label: 'Inactive' },
];

const CrossplaneMrdContent = () => {
  const { entity } = useEntity();
  const crossplaneApi = useApi(crossplaneApiRef);
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
  const annotationPrefix = getAnnotationPrefix(config);
  const { allowed: canListTemp } = usePermission({
    permission: listManagedResourceDefinitionsPermission,
  });
  const canList = enablePermissions ? canListTemp : true;

  const [items, setItems] = useState<ManagedResourceDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'All' | 'Namespaced' | 'Cluster'>('All');
  const [stateFilter, setStateFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [selectedMrd, setSelectedMrd] = useState<ManagedResourceDefinition | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('schema');

  const [summary, setSummary] = useState({
    total: 0,
    namespacedCount: 0,
    clusterScopedCount: 0,
    activeCount: 0,
    inactiveCount: 0,
  });

  useEffect(() => {
    if (!canList) return;

    const clusterName = getProviderClusterName(entity);
    const providerName = getProviderName(entity, annotationPrefix);

    if (!clusterName) return;

    setLoading(true);
    setError(null);

    crossplaneApi
      .getManagedResourceDefinitions(clusterName, providerName)
      .then(response => {
        setItems(response.items);
        setSummary({
          total: response.items.length,
          namespacedCount: response.namespacedCount,
          clusterScopedCount: response.clusterScopedCount,
          activeCount: response.activeCount,
          inactiveCount: response.inactiveCount,
        });
      })
      .catch(err => {
        setError(err?.message || 'Failed to load MRDs');
      })
      .finally(() => setLoading(false));
  }, [canList, crossplaneApi, entity, annotationPrefix]);

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (scopeFilter !== 'All' && item.spec?.scope !== scopeFilter) return false;
      if (stateFilter !== 'All' && item.spec?.state !== stateFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !item.metadata?.name?.toLowerCase().includes(q) &&
          !item.spec?.names?.kind?.toLowerCase().includes(q) &&
          !item.spec?.group?.toLowerCase().includes(q) &&
          !item.spec?.names?.plural?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [items, search, scopeFilter, stateFilter]);

  const openDrawer = (mrd: ManagedResourceDefinition) => {
    setSelectedMrd(mrd);
    setDrawerOpen(true);
    setDrawerTab('schema');
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedMrd(null);
  };

  const getRawYaml = (mrd: ManagedResourceDefinition) => yaml.dump(mrd, { indent: 2 });

  const handleYamlDownload = () => {
    if (!selectedMrd) return;
    const blob = new Blob([getRawYaml(selectedMrd)], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedMrd.metadata?.name || 'mrd'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canList) {
    return (
      <Card>
        <CardBody>
          <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)' }}>
            You do not have permission to view Managed Resource Definitions.
          </Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Box>
      {loading && (
        <Flex align="center" justify="center" py="4">
          <Progress />
        </Flex>
      )}

      {error && (
        <Box mb="4">
          <Text variant="body-small" style={{ color: 'var(--bui-fg-negative)' }}>
            {error}
          </Text>
        </Box>
      )}

      {!loading && !error && (
        <>
          {/* ── Summary badges ── */}
          <Box className={styles.summaryBadges}>
            <Badge>{`Total: ${summary.total}`}</Badge>
            <Badge style={{ color: 'var(--bui-fg-announcement)' }}>{`Namespaced: ${summary.namespacedCount}`}</Badge>
            <Badge style={{ color: 'var(--bui-fg-warning)' }}>{`Cluster Scoped: ${summary.clusterScopedCount}`}</Badge>
            <Badge style={{ color: 'var(--bui-fg-positive)' }}>{`Active: ${summary.activeCount}`}</Badge>
            <Badge style={{ color: 'var(--bui-fg-negative)' }}>{`Inactive: ${summary.inactiveCount}`}</Badge>
          </Box>

          {/* ── Toolbar: search + filters ── */}
          <Flex className={styles.toolbar}>
            <Box className={styles.searchField}>
              <TextField
                size="small"
                placeholder="Search by name, kind, group..."
                icon={<RiSearchLine />}
                value={search}
                onChange={setSearch}
              />
            </Box>
            <Box className={styles.filterSelect}>
              <Select
                label="Scope"
                selectedKey={scopeFilter}
                onSelectionChange={key => setScopeFilter(String(key) as typeof scopeFilter)}
                options={SCOPE_OPTIONS}
              />
            </Box>
            <Box className={styles.filterSelect}>
              <Select
                label="State"
                selectedKey={stateFilter}
                onSelectionChange={key => setStateFilter(String(key) as typeof stateFilter)}
                options={STATE_OPTIONS}
              />
            </Box>
            {(search || scopeFilter !== 'All' || stateFilter !== 'All') && (
              <Button
                size="small"
                variant="secondary"
                onPress={() => {
                  setSearch('');
                  setScopeFilter('All');
                  setStateFilter('All');
                }}
              >
                Clear Filters
              </Button>
            )}
          </Flex>

          {/* ── Table ── */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.tableCell} ${styles.headerCell}`}>Name</th>
                  <th className={`${styles.tableCell} ${styles.headerCell}`}>Kind</th>
                  <th className={`${styles.tableCell} ${styles.headerCell}`}>Group</th>
                  <th className={`${styles.tableCell} ${styles.headerCell}`}>Plural</th>
                  <th className={`${styles.tableCell} ${styles.headerCell}`}>Scope</th>
                  <th className={`${styles.tableCell} ${styles.headerCell}`}>State</th>
                  <th className={`${styles.tableCell} ${styles.headerCell}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td className={styles.tableCell} colSpan={7} style={{ textAlign: 'center' }}>
                      <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)' }}>
                        {items.length === 0
                          ? 'No Managed Resource Definitions found.'
                          : 'No results match the current filters.'}
                      </Text>
                    </td>
                  </tr>
                )}
                {filtered.map(mrd => (
                  <tr
                    key={mrd.metadata?.uid || mrd.metadata?.name}
                    className={styles.clickableRow}
                    onClick={() => openDrawer(mrd)}
                  >
                    <td className={styles.tableCell}>
                      <Text variant="body-small">{mrd.metadata?.name}</Text>
                    </td>
                    <td className={styles.tableCell}>
                      <Text variant="body-small">{mrd.spec?.names?.kind}</Text>
                    </td>
                    <td className={styles.tableCell}>
                      <Text variant="body-small">{mrd.spec?.group}</Text>
                    </td>
                    <td className={styles.tableCell}>
                      <Text variant="body-small">{mrd.spec?.names?.plural}</Text>
                    </td>
                    <td className={styles.tableCell}>
                      <Badge className={mrd.spec?.scope === 'Namespaced' ? styles.scopeChipNamespaced : styles.scopeChipCluster}>
                        {mrd.spec?.scope}
                      </Badge>
                    </td>
                    <td className={styles.tableCell}>
                      <Badge className={mrd.spec?.state === 'Active' ? styles.stateChipActive : styles.stateChipInactive}>
                        {mrd.spec?.state ?? 'Unknown'}
                      </Badge>
                    </td>
                    <td className={styles.tableCell}>
                      <TooltipTrigger>
                        <ButtonIcon
                          aria-label="View Definition"
                          icon={<RiFileTextLine />}
                          size="small"
                          onPress={() => openDrawer(mrd)}
                        />
                        <Tooltip>View Definition</Tooltip>
                      </TooltipTrigger>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Box mt="2">
            <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)' }}>
              Showing {filtered.length} of {items.length} MRDs
            </Text>
          </Box>
        </>
      )}

      {/* ── Detail Drawer ── */}
      <Drawer anchor="right" open={drawerOpen} onClose={closeDrawer}>
        <Box className={styles.drawerBody}>
          {selectedMrd && (
            <>
              {/* Drawer header */}
              <Flex align="center" justify="between" className={styles.drawerHeader}>
                <Box>
                  <Text variant="title-small" weight="bold" style={{ display: 'block' }}>{selectedMrd.metadata?.name}</Text>
                  <Flex gap="2" mt="1">
                    <Badge className={selectedMrd.spec?.scope === 'Namespaced' ? styles.scopeChipNamespaced : styles.scopeChipCluster}>
                      {selectedMrd.spec?.scope}
                    </Badge>
                    <Badge className={selectedMrd.spec?.state === 'Active' ? styles.stateChipActive : styles.stateChipInactive}>
                      {selectedMrd.spec?.state ?? 'Unknown'}
                    </Badge>
                  </Flex>
                </Box>
                <ButtonIcon aria-label="Close" icon={<RiCloseLine />} size="small" onPress={closeDrawer} />
              </Flex>

              {/* Tab bar */}
              <Tabs selectedKey={drawerTab} onSelectionChange={key => setDrawerTab(String(key))}>
                <TabList>
                  <Tab id="schema">Schema Explorer</Tab>
                  <Tab id="yaml">Raw YAML</Tab>
                </TabList>

                <TabPanel id="schema">
                  <Box className={styles.drawerContent}>
                    <MrdDefinitionWidget mrd={selectedMrd} />
                  </Box>
                </TabPanel>

                <TabPanel id="yaml">
                  <Flex className={styles.rawYamlActions}>
                    <CopyTextButton text={getRawYaml(selectedMrd)} aria-label="Copy YAML to clipboard" />
                    <TooltipTrigger>
                      <ButtonIcon aria-label="Download YAML" icon={<RiDownloadLine />} size="small" onPress={handleYamlDownload} />
                      <Tooltip>Download YAML</Tooltip>
                    </TooltipTrigger>
                  </Flex>
                  <Box className={styles.drawerContent} style={{ padding: 'var(--bui-space-4)' }}>
                    <SyntaxHighlighter
                      language="yaml"
                      style={tomorrow}
                      customStyle={{
                        fontSize: '12px',
                        borderRadius: '4px',
                        margin: 0,
                      }}
                    >
                      {getRawYaml(selectedMrd)}
                    </SyntaxHighlighter>
                  </Box>
                </TabPanel>
              </Tabs>
            </>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default CrossplaneMrdContent;
