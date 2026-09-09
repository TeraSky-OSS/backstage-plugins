import { useState, useMemo, useCallback } from 'react';
import {
  useApi,
  appTreeApiRef,
  AppTree,
  ExtensionAttachTo,
} from '@backstage/frontend-plugin-api';
import {
  Content,
  Page,
  Table as BackstageTable,
  TableColumn,
} from '@backstage/core-components';
import {
  Badge,
  Button,
  ButtonIcon,
  Card,
  CardBody,
  Flex,
  Select,
  Text,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckboxCircleLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiCloseLine,
  RiContractUpDownLine,
  RiDashboardLine,
  RiExpandUpDownLine,
  RiFileCopyLine,
  RiPuzzleLine,
  RiSearchLine,
  RiShutDownLine,
  RiTableLine,
} from '@remixicon/react';
import styles from './FrontendExtensionsExplorerPage.module.css';
// BUI-EXCEPTION: `Drawer` has no BUI equivalent (see MUI_TO_BUI_MIGRATION.md exception list).
import { Drawer } from '@material-ui/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtensionInfo {
  id: string;
  pluginId: string;
  extensionType: string;
  isDisabled: boolean;
  isInstantiated: boolean;
  attachToId: string;
  attachToInput: string;
  config: unknown;
  dataRefs: string[];
}

type ViewMode = 'cards' | 'table';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXTENSION_TYPE_LABELS: Record<string, string> = {
  page: 'Page',
  'nav-item': 'Nav Item',
  'entity-content': 'Entity Content',
  'entity-card': 'Entity Card',
  'entity-header-card': 'Entity Header Card',
  'entity-switch': 'Entity Switch',
  api: 'API',
  nav: 'Nav',
  app: 'App',
  'sign-in-page': 'Sign-In Page',
  'plugin-header-action': 'Plugin Header Action',
  'search-result-list-item': 'Search Result Item',
  'search-filter': 'Search Filter',
  'scaffold-field': 'Scaffold Field',
  'scaffolder-action': 'Scaffolder Action',
  'scaffolder-step': 'Scaffolder Step',
  theme: 'Theme',
  'translation-resource': 'Translation',
  'feature-flag': 'Feature Flag',
};

function normalizeAttachTo(attachTo: ExtensionAttachTo): { id: string; input: string } {
  if (Array.isArray(attachTo)) {
    return attachTo[0] ?? { id: '', input: '' };
  }
  return attachTo;
}

function getExtensionType(id: string): string {
  const prefix = id.split(':')[0];
  if (EXTENSION_TYPE_LABELS[prefix]) return EXTENSION_TYPE_LABELS[prefix];
  // Capitalise each hyphenated word as fallback
  return prefix
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildExtensions(tree: AppTree): ExtensionInfo[] {
  const result: ExtensionInfo[] = [];
  for (const [, node] of tree.nodes) {
    const spec = node.spec;
    const attach = spec.attachTo ? normalizeAttachTo(spec.attachTo) : { id: '', input: '' };
    result.push({
      id: spec.id,
      pluginId: spec.plugin?.pluginId ?? '(core)',
      extensionType: getExtensionType(spec.id),
      isDisabled: spec.disabled,
      isInstantiated: !!node.instance,
      attachToId: attach.id,
      attachToInput: attach.input,
      config: spec.config,
      dataRefs: node.instance
        ? Array.from(node.instance.getDataRefs()).map(ref => ref.id)
        : [],
    });
  }
  return result;
}

function formatJson(value: unknown): string {
  if (value === undefined || value === null) return '{}';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type ExtensionStatus = 'enabled' | 'disabled' | 'not-running';

function getStatus(ext: ExtensionInfo): ExtensionStatus {
  if (ext.isDisabled) return 'disabled';
  if (!ext.isInstantiated) return 'not-running';
  return 'enabled';
}

function statusDescription(ext: ExtensionInfo): string {
  if (ext.isDisabled) return 'Marked disabled in configuration';
  if (ext.isInstantiated) return 'Active and instantiated';
  return 'Enabled but not instantiated (may depend on context)';
}

function statusLabel(status: ExtensionStatus): string {
  if (status === 'enabled') return 'Enabled';
  if (status === 'disabled') return 'Disabled';
  return 'Not Running';
}

function statusClassName(status: ExtensionStatus): string {
  if (status === 'enabled') return styles.statusEnabled;
  if (status === 'disabled') return styles.statusDisabled;
  return styles.statusNotRunning;
}

function StatusChip({ ext, className }: { ext: ExtensionInfo; className?: string }) {
  const status = getStatus(ext);
  return (
    <Badge className={`${statusClassName(status)} ${className ?? ''}`}>
      {statusLabel(status)}
    </Badge>
  );
}

function StatusIcon({ ext }: { ext: ExtensionInfo }) {
  const status = getStatus(ext);
  if (status === 'enabled') {
    return (
      <TooltipTrigger>
        <RiCheckboxCircleLine size={18} className={styles.statusEnabled} />
        <Tooltip>Enabled</Tooltip>
      </TooltipTrigger>
    );
  }
  if (status === 'disabled') {
    return (
      <TooltipTrigger>
        <RiCloseCircleLine size={18} className={styles.statusDisabled} />
        <Tooltip>Disabled</Tooltip>
      </TooltipTrigger>
    );
  }
  return (
    <TooltipTrigger>
      <RiShutDownLine size={18} className={styles.statusNotRunning} />
      <Tooltip>Not Running (enabled but not instantiated)</Tooltip>
    </TooltipTrigger>
  );
}

const TYPE_COLORS: Record<string, string> = {
  Page: '#1565c0',
  'Nav Item': '#6a1b9a',
  'Entity Content': '#00838f',
  'Entity Card': '#2e7d32',
  API: '#e65100',
  Nav: '#37474f',
  App: '#4a148c',
  'Sign-In Page': '#880e4f',
  Theme: '#f57f17',
};

function TypeChip({ type, className }: { type: string; className?: string }) {
  const bgColor = TYPE_COLORS[type] ?? '#546e7a';
  return (
    <Badge
      className={className}
      style={{
        backgroundColor: bgColor,
        color: '#fff',
      }}
    >
      {type}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Extension Detail Drawer
// ---------------------------------------------------------------------------

function ExtensionDetailDrawer({
  ext,
  onClose,
}: {
  ext: ExtensionInfo | null;
  onClose: () => void;
}) {
  return (
    <Drawer
      anchor="right"
      open={!!ext}
      onClose={onClose}
      PaperProps={{ className: styles.drawerPaper }}
    >
      {ext && (
        <>
          <div className={styles.drawerHeader}>
            <Text as="h6" className={styles.drawerTitle}>
              {ext.id}
            </Text>
            <ButtonIcon
              aria-label="Close"
              size="small"
              variant="tertiary"
              icon={<RiCloseLine />}
              onPress={onClose}
            />
          </div>

          <hr className={styles.divider} />

          <div className={styles.drawerSection}>
            <Text className={styles.drawerLabel}>Plugin</Text>
            <Text style={{ fontFamily: 'monospace' }}>{ext.pluginId}</Text>
          </div>

          <div className={styles.drawerSection}>
            <Text className={styles.drawerLabel}>Extension Type</Text>
            <TypeChip type={ext.extensionType} />
          </div>

          <div className={styles.drawerSection}>
            <Text className={styles.drawerLabel}>Status</Text>
            <Flex align="center" gap="2">
              <StatusChip ext={ext} />
              <Text style={{ color: 'var(--bui-fg-secondary)' }}>
                {statusDescription(ext)}
              </Text>
            </Flex>
          </div>

          <hr className={styles.divider} />

          <div className={styles.drawerSection}>
            <Text className={styles.drawerLabel}>Attaches To</Text>
            {ext.attachToId ? (
              <Text style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                <strong>{ext.attachToId}</strong>
                {ext.attachToInput && (
                  <span style={{ color: 'var(--bui-fg-secondary)' }}>
                    {' '}
                    → input: <em>{ext.attachToInput}</em>
                  </span>
                )}
              </Text>
            ) : (
              <Text style={{ color: 'var(--bui-fg-secondary)' }}>None (root node)</Text>
            )}
          </div>

          {ext.dataRefs.length > 0 && (
            <div className={styles.drawerSection}>
              <Text className={styles.drawerLabel}>
                Output Data Refs ({ext.dataRefs.length})
              </Text>
              <Flex gap="1" style={{ flexWrap: 'wrap' }}>
                {ext.dataRefs.map(ref => (
                  <Badge key={ref} className={styles.dataRefChip}>
                    {ref}
                  </Badge>
                ))}
              </Flex>
            </div>
          )}

          <div className={styles.drawerSection}>
            <Text className={styles.drawerLabel}>Current Config</Text>
            {ext.config !== undefined && ext.config !== null ? (
              <pre className={styles.codeBlock}>{formatJson(ext.config)}</pre>
            ) : (
              <Text style={{ color: 'var(--bui-fg-secondary)' }}>
                No config applied (using extension defaults)
              </Text>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------

function StatsBar({
  extensions,
  plugins,
}: {
  extensions: ExtensionInfo[];
  plugins: string[];
}) {
  const enabled = extensions.filter(e => !e.isDisabled && e.isInstantiated).length;
  const disabled = extensions.filter(e => e.isDisabled).length;
  const notRunning = extensions.filter(e => !e.isDisabled && !e.isInstantiated).length;

  const stats = [
    { label: 'Plugins', value: plugins.length, color: '#1565c0' },
    { label: 'Extensions', value: extensions.length, color: '#78909c' },
    { label: 'Enabled', value: enabled, color: '#2e7d32' },
    { label: 'Disabled', value: disabled, color: '#c62828' },
    { label: 'Not Running', value: notRunning, color: '#e65100' },
  ];

  return (
    <div className={styles.statsContainer}>
      {stats.map(s => (
        <Card key={s.label} className={styles.statCard}>
          <CardBody>
            <Text className={styles.statNumber} style={{ color: s.color }}>
              {s.value}
            </Text>
            <Text className={styles.statLabel}>{s.label}</Text>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extension Row (card view)
// ---------------------------------------------------------------------------

function ExtensionRow({
  ext,
  onClick,
}: {
  ext: ExtensionInfo;
  onClick: () => void;
}) {
  const isDisabled = getStatus(ext) !== 'enabled';
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(ext.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [ext.id]);

  return (
    <div
      className={styles.extensionRow}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
    >
      <StatusIcon ext={ext} />
      <TooltipTrigger>
        <Text
          className={styles.extensionId}
          style={isDisabled ? { color: 'var(--bui-fg-disabled)' } : undefined}
        >
          {ext.id}
        </Text>
        <Tooltip>{ext.id}</Tooltip>
      </TooltipTrigger>
      <TooltipTrigger>
        <ButtonIcon
          aria-label={copied ? 'Copied' : 'Copy extension ID'}
          size="small"
          variant="tertiary"
          icon={copied ? <RiCheckLine /> : <RiFileCopyLine />}
          onPress={handleCopy}
        />
        <Tooltip>{copied ? 'Copied!' : 'Copy extension ID'}</Tooltip>
      </TooltipTrigger>
      <TypeChip type={ext.extensionType} className={styles.typeChip} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plugin Card (card view)
// ---------------------------------------------------------------------------

function PluginCard({
  pluginId,
  extensions,
  onExtensionClick,
  isCollapsed,
  onToggleCollapse,
}: {
  pluginId: string;
  extensions: ExtensionInfo[];
  onExtensionClick: (ext: ExtensionInfo) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const enabledCount = extensions.filter(e => getStatus(e) === 'enabled').length;
  const disabledCount = extensions.filter(e => getStatus(e) === 'disabled').length;

  return (
    <Card className={styles.pluginCard}>
      <div
        className={styles.pluginCardHeader}
        onClick={onToggleCollapse}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onToggleCollapse();
        }}
      >
        <RiPuzzleLine size={18} className={styles.pluginIcon} />
        <Text className={styles.pluginTitle}>{pluginId}</Text>
        <Text className={styles.pluginCount}>
          {extensions.length} extensions &nbsp;·&nbsp; {enabledCount} enabled &nbsp;·&nbsp;{' '}
          {disabledCount} disabled
        </Text>
        <ButtonIcon
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          size="small"
          variant="tertiary"
          icon={isCollapsed ? <RiArrowDownSLine /> : <RiArrowUpSLine />}
          onPress={onToggleCollapse}
        />
      </div>
      {!isCollapsed && (
        <CardBody style={{ padding: 0 }}>
          {extensions.map(ext => (
            <ExtensionRow
              key={ext.id}
              ext={ext}
              onClick={() => onExtensionClick(ext)}
            />
          ))}
        </CardBody>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Table View
// ---------------------------------------------------------------------------

function ExtensionTable({
  extensions,
  onRowClick,
}: {
  extensions: ExtensionInfo[];
  onRowClick: (ext: ExtensionInfo) => void;
}) {
  const columns: TableColumn<ExtensionInfo>[] = [
    {
      title: 'Extension ID',
      field: 'id',
      render: ext => <span className={styles.tableIdCell}>{ext.id}</span>,
    },
    {
      title: 'Plugin',
      field: 'pluginId',
      render: ext => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{ext.pluginId}</span>
      ),
    },
    {
      title: 'Type',
      field: 'extensionType',
      render: ext => <TypeChip type={ext.extensionType} />,
    },
    {
      title: 'Status',
      render: ext => (
        <Flex align="center" gap="1">
          <StatusIcon ext={ext} />
          <StatusChip ext={ext} className={styles.statusChip} />
        </Flex>
      ),
    },
    {
      title: 'Attach To',
      render: ext => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {ext.attachToId || '—'}
          {ext.attachToInput && ` → ${ext.attachToInput}`}
        </span>
      ),
    },
    {
      title: 'Config',
      render: ext =>
        ext.config !== undefined && ext.config !== null ? (
          <TooltipTrigger>
            <Badge style={{ cursor: 'pointer' }}>View</Badge>
            <Tooltip>
              <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', margin: 0 }}>
                {formatJson(ext.config)}
              </pre>
            </Tooltip>
          </TooltipTrigger>
        ) : (
          <span style={{ color: 'var(--bui-fg-secondary)' }}>—</span>
        ),
    },
  ];

  return (
    <BackstageTable
      options={{ search: false, paging: false }}
      columns={columns}
      data={extensions}
      onRowClick={(_event, rowData) => {
        if (rowData) onRowClick(rowData);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function FrontendExtensionsExplorerPage() {
  const appTreeApi = useApi(appTreeApiRef);
  const { tree } = appTreeApi.getTree();

  const allExtensions = useMemo(() => buildExtensions(tree), [tree]);

  const allPlugins = useMemo(
    () => Array.from(new Set(allExtensions.map(e => e.pluginId))).sort(),
    [allExtensions],
  );

  const allTypes = useMemo(
    () => Array.from(new Set(allExtensions.map(e => e.extensionType))).sort(),
    [allExtensions],
  );

  const [search, setSearch] = useState('');
  const [filterPlugin, setFilterPlugin] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedExt, setSelectedExt] = useState<ExtensionInfo | null>(null);
  const [collapsedPlugins, setCollapsedPlugins] = useState<Set<string>>(new Set());

  const togglePlugin = (pluginId: string) => {
    setCollapsedPlugins(prev => {
      const next = new Set(prev);
      if (next.has(pluginId)) next.delete(pluginId);
      else next.add(pluginId);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allExtensions.filter(ext => {
      if (q && !ext.id.toLowerCase().includes(q) && !ext.pluginId.toLowerCase().includes(q))
        return false;
      if (filterPlugin !== 'all' && ext.pluginId !== filterPlugin) return false;
      if (filterType !== 'all' && ext.extensionType !== filterType) return false;
      if (filterStatus !== 'all') {
        const s = getStatus(ext);
        if (filterStatus === 'enabled' && s !== 'enabled') return false;
        if (filterStatus === 'disabled' && s !== 'disabled') return false;
        if (filterStatus === 'not-running' && s !== 'not-running') return false;
      }
      return true;
    });
  }, [allExtensions, search, filterPlugin, filterType, filterStatus]);

  const pluginGroups = useMemo(() => {
    const map = new Map<string, ExtensionInfo[]>();
    for (const ext of filtered) {
      const list = map.get(ext.pluginId) ?? [];
      list.push(ext);
      map.set(ext.pluginId, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const collapseAll = () => {
    setCollapsedPlugins(new Set(pluginGroups.map(([id]) => id)));
  };

  const expandAll = () => {
    setCollapsedPlugins(new Set());
  };

  return (
    <Page themeId="tool">
      <Content>
        <Text style={{ color: 'var(--bui-fg-secondary)', marginBottom: 'var(--bui-space-4)' }}>
          Inspect all New Frontend System extensions loaded in this app
        </Text>

        <StatsBar extensions={allExtensions} plugins={allPlugins} />

        {/* Filter bar */}
        <div className={styles.filtersContainer}>
          <TextField
            className={styles.searchField}
            size="small"
            icon={<RiSearchLine size={16} />}
            placeholder="Search by extension ID or plugin…"
            value={search}
            onChange={setSearch}
          />

          <Select
            className={styles.filterSelect}
            size="small"
            label="Type"
            selectedKey={filterType}
            onSelectionChange={key => setFilterType(String(key))}
            options={[
              { id: 'all', label: 'All Types' },
              ...allTypes.map(t => ({ id: t, label: t })),
            ]}
          />

          <Select
            className={styles.filterSelect}
            size="small"
            label="Plugin"
            selectedKey={filterPlugin}
            onSelectionChange={key => setFilterPlugin(String(key))}
            options={[
              { id: 'all', label: 'All Plugins' },
              ...allPlugins.map(p => ({ id: p, label: p })),
            ]}
          />

          <Select
            className={styles.filterSelect}
            size="small"
            label="Status"
            selectedKey={filterStatus}
            onSelectionChange={key => setFilterStatus(String(key))}
            options={[
              { id: 'all', label: 'All Statuses' },
              { id: 'enabled', label: 'Enabled' },
              { id: 'disabled', label: 'Disabled' },
              { id: 'not-running', label: 'Not Running' },
            ]}
          />

          <ToggleButtonGroup
            className={styles.viewToggle}
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[viewMode]}
            onSelectionChange={keys => {
              const [v] = Array.from(keys);
              if (v) setViewMode(v as ViewMode);
            }}
          >
            <TooltipTrigger>
              <ToggleButton id="cards" aria-label="card view">
                <RiDashboardLine size={16} />
              </ToggleButton>
              <Tooltip>Plugin Card View</Tooltip>
            </TooltipTrigger>
            <TooltipTrigger>
              <ToggleButton id="table" aria-label="table view">
                <RiTableLine size={16} />
              </ToggleButton>
              <Tooltip>Flat Table View</Tooltip>
            </TooltipTrigger>
          </ToggleButtonGroup>
        </div>

        {filtered.length === 0 && (
          <Card className={styles.emptyState}>
            <CardBody>
              <Text style={{ color: 'var(--bui-fg-secondary)' }}>
                No extensions match the current filters.
              </Text>
            </CardBody>
          </Card>
        )}
        {filtered.length > 0 && viewMode === 'cards' && (
          <>
            <Flex align="center" gap="2" style={{ marginBottom: 'var(--bui-space-2)' }}>
              <Button
                size="small"
                variant="secondary"
                iconStart={<RiContractUpDownLine size={16} />}
                onPress={collapseAll}
              >
                Collapse All
              </Button>
              <Button
                size="small"
                variant="secondary"
                iconStart={<RiExpandUpDownLine size={16} />}
                onPress={expandAll}
              >
                Expand All
              </Button>
            </Flex>
            <Flex direction="column" gap="0">
              {pluginGroups.map(([pluginId, exts]) => (
                <PluginCard
                  key={pluginId}
                  pluginId={pluginId}
                  extensions={exts}
                  onExtensionClick={setSelectedExt}
                  isCollapsed={collapsedPlugins.has(pluginId)}
                  onToggleCollapse={() => togglePlugin(pluginId)}
                />
              ))}
            </Flex>
          </>
        )}
        {filtered.length > 0 && viewMode === 'table' && (
          <ExtensionTable extensions={filtered} onRowClick={setSelectedExt} />
        )}

        <ExtensionDetailDrawer
          ext={selectedExt}
          onClose={() => setSelectedExt(null)}
        />
      </Content>
    </Page>
  );
}
