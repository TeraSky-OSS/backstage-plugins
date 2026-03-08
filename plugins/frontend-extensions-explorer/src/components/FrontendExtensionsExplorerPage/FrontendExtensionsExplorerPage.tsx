import { useState, useMemo, useCallback, MouseEvent } from 'react';
import {
  useApi,
  appTreeApiRef,
  AppTree,
  ExtensionAttachTo,
} from '@backstage/frontend-plugin-api';
import {
  Content,
  ContentHeader,
  Header,
  Page,
} from '@backstage/core-components';
import {
  makeStyles,
  Theme,
  createStyles,
  Typography,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Drawer,
  IconButton,
  Divider,
  CardContent,
  Tooltip,
  Box,
  Grid,
  TableContainer,
  TableSortLabel,
  InputAdornment,
  Collapse,
  Button,
} from '@material-ui/core';
import {
  ToggleButton,
  ToggleButtonGroup,
} from '@material-ui/lab';
import CloseIcon from '@material-ui/icons/Close';
import SearchIcon from '@material-ui/icons/Search';
import ViewListIcon from '@material-ui/icons/ViewList';
import DashboardIcon from '@material-ui/icons/Dashboard';
import ExtensionIcon from '@material-ui/icons/Extension';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CancelIcon from '@material-ui/icons/Cancel';
import PowerIcon from '@material-ui/icons/PowerSettingsNew';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import UnfoldLessIcon from '@material-ui/icons/UnfoldLess';
import UnfoldMoreIcon from '@material-ui/icons/UnfoldMore';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';
import CheckIcon from '@material-ui/icons/Check';

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
type SortField = 'id' | 'pluginId' | 'extensionType' | 'status';
type SortDir = 'asc' | 'desc';

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
// Styles
// ---------------------------------------------------------------------------

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    statsContainer: {
      display: 'flex',
      gap: theme.spacing(2),
      marginBottom: theme.spacing(3),
      flexWrap: 'wrap',
    },
    statCard: {
      padding: theme.spacing(2, 3),
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1.5),
      minWidth: 160,
    },
    statNumber: {
      fontSize: '1.8rem',
      fontWeight: 700,
      lineHeight: 1,
    },
    statLabel: {
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: theme.palette.text.secondary,
    },
    filtersContainer: {
      display: 'flex',
      gap: theme.spacing(2),
      marginBottom: theme.spacing(3),
      flexWrap: 'wrap',
      alignItems: 'flex-end',
    },
    searchField: {
      minWidth: 240,
    },
    filterSelect: {
      minWidth: 160,
    },
    viewToggle: {
      marginLeft: 'auto',
    },
    pluginCard: {
      marginBottom: theme.spacing(2),
      border: `1px solid ${theme.palette.divider}`,
    },
    pluginCardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      padding: theme.spacing(1.5, 2),
      backgroundColor:
        theme.palette.type === 'dark'
          ? theme.palette.grey[800]
          : theme.palette.grey[100],
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    pluginIcon: {
      color: theme.palette.text.secondary,
      fontSize: '1.1rem',
    },
    pluginTitle: {
      fontWeight: 600,
      flexGrow: 1,
    },
    pluginCount: {
      color: theme.palette.text.secondary,
      fontSize: '0.85rem',
    },
    extensionRow: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      padding: theme.spacing(1, 2),
      cursor: 'pointer',
      borderBottom: `1px solid ${theme.palette.divider}`,
      '&:last-child': {
        borderBottom: 'none',
      },
      '&:hover': {
        backgroundColor:
          theme.palette.type === 'dark'
            ? theme.palette.grey[700]
            : theme.palette.grey[50],
      },
    },
    extensionId: {
      flexGrow: 1,
      fontFamily: 'monospace',
      fontSize: '0.85rem',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    disabledText: {
      color: theme.palette.text.disabled,
    },
    typeChip: {
      height: 22,
      fontSize: '0.7rem',
    },
    statusChip: {
      height: 22,
      fontSize: '0.7rem',
    },
    drawerPaper: {
      width: 480,
      padding: theme.spacing(3),
    },
    drawerHeader: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: theme.spacing(2),
    },
    drawerTitle: {
      flexGrow: 1,
      fontFamily: 'monospace',
      wordBreak: 'break-all',
    },
    drawerSection: {
      marginBottom: theme.spacing(2),
    },
    drawerLabel: {
      fontSize: '0.7rem',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: theme.palette.text.secondary,
      marginBottom: theme.spacing(0.5),
    },
    codeBlock: {
      fontFamily: 'monospace',
      fontSize: '0.8rem',
      backgroundColor:
        theme.palette.type === 'dark'
          ? theme.palette.grey[900]
          : theme.palette.grey[100],
      padding: theme.spacing(1.5),
      borderRadius: theme.shape.borderRadius,
      overflowX: 'auto',
      whiteSpace: 'pre',
      maxHeight: 300,
      overflowY: 'auto',
      border: `1px solid ${theme.palette.divider}`,
    },
    dataRefChip: {
      margin: theme.spacing(0.25),
      height: 22,
      fontSize: '0.7rem',
      fontFamily: 'monospace',
    },
    tableRow: {
      cursor: 'pointer',
    },
    tableIdCell: {
      fontFamily: 'monospace',
      fontSize: '0.8rem',
    },
    enabledIcon: {
      color: theme.palette.success?.main ?? '#4caf50',
      fontSize: '1rem',
    },
    disabledIcon: {
      color: theme.palette.error.main,
      fontSize: '1rem',
    },
    notRunningIcon: {
      color: theme.palette.warning?.main ?? '#ff9800',
      fontSize: '1rem',
    },
  }),
);

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

function StatusChip({ ext, className }: { ext: ExtensionInfo; className?: string }) {
  const status = getStatus(ext);
  const label = statusLabel(status);
  const color: 'default' | 'primary' | 'secondary' =
    status === 'enabled' ? 'primary' : 'default';
  return (
    <Chip
      className={className}
      size="small"
      label={label}
      color={color}
      variant={status === 'enabled' ? 'default' : 'outlined'}
    />
  );
}

function StatusIcon({ ext }: { ext: ExtensionInfo }) {
  const classes = useStyles();
  const status = getStatus(ext);
  if (status === 'enabled') {
    return (
      <Tooltip title="Enabled">
        <CheckCircleIcon className={classes.enabledIcon} />
      </Tooltip>
    );
  }
  if (status === 'disabled') {
    return (
      <Tooltip title="Disabled">
        <CancelIcon className={classes.disabledIcon} />
      </Tooltip>
    );
  }
  return (
    <Tooltip title="Not Running (enabled but not instantiated)">
      <PowerIcon className={classes.notRunningIcon} />
    </Tooltip>
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
    <Chip
      className={className}
      size="small"
      label={type}
      style={{
        backgroundColor: bgColor,
        color: '#fff',
        height: 22,
        fontSize: '0.7rem',
      }}
    />
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
  const classes = useStyles();

  return (
    <Drawer
      anchor="right"
      open={!!ext}
      onClose={onClose}
      classes={{ paper: classes.drawerPaper }}
    >
      {ext && (
        <>
          <div className={classes.drawerHeader}>
            <Typography variant="h6" className={classes.drawerTitle}>
              {ext.id}
            </Typography>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>

          <Divider style={{ marginBottom: 16 }} />

          <div className={classes.drawerSection}>
            <Typography className={classes.drawerLabel}>Plugin</Typography>
            <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
              {ext.pluginId}
            </Typography>
          </div>

          <div className={classes.drawerSection}>
            <Typography className={classes.drawerLabel}>Extension Type</Typography>
            <TypeChip type={ext.extensionType} />
          </div>

          <div className={classes.drawerSection}>
            <Typography className={classes.drawerLabel}>Status</Typography>
            <Box display="flex" alignItems="center" gridGap={8}>
              <StatusChip ext={ext} />
              <Typography variant="caption" color="textSecondary">
                {statusDescription(ext)}
              </Typography>
            </Box>
          </div>

          <Divider style={{ marginBottom: 16 }} />

          <div className={classes.drawerSection}>
            <Typography className={classes.drawerLabel}>Attaches To</Typography>
            {ext.attachToId ? (
              <Typography
                variant="body2"
                style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
              >
                <strong>{ext.attachToId}</strong>
                {ext.attachToInput && (
                  <span style={{ color: '#888' }}>
                    {' '}
                    → input: <em>{ext.attachToInput}</em>
                  </span>
                )}
              </Typography>
            ) : (
              <Typography variant="body2" color="textSecondary">
                None (root node)
              </Typography>
            )}
          </div>

          {ext.dataRefs.length > 0 && (
            <div className={classes.drawerSection}>
              <Typography className={classes.drawerLabel}>
                Output Data Refs ({ext.dataRefs.length})
              </Typography>
              <Box display="flex" flexWrap="wrap">
                {ext.dataRefs.map(ref => (
                  <Chip
                    key={ref}
                    className={classes.dataRefChip}
                    label={ref}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </div>
          )}

          <div className={classes.drawerSection}>
            <Typography className={classes.drawerLabel}>Current Config</Typography>
            {ext.config !== undefined && ext.config !== null ? (
              <pre className={classes.codeBlock}>{formatJson(ext.config)}</pre>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No config applied (using extension defaults)
              </Typography>
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
  const classes = useStyles();
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
    <div className={classes.statsContainer}>
      {stats.map(s => (
        <Paper key={s.label} className={classes.statCard} elevation={1}>
          <div>
            <Typography
              className={classes.statNumber}
              style={{ color: s.color }}
            >
              {s.value}
            </Typography>
            <Typography className={classes.statLabel}>{s.label}</Typography>
          </div>
        </Paper>
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
  const classes = useStyles();
  const isDisabled = getStatus(ext) !== 'enabled';
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(ext.id).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [ext.id],
  );

  return (
    <div className={classes.extensionRow} onClick={onClick} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}>
      <StatusIcon ext={ext} />
      <Tooltip title={ext.id}>
        <Typography
          className={`${classes.extensionId} ${isDisabled ? classes.disabledText : ''}`}
        >
          {ext.id}
        </Typography>
      </Tooltip>
      <Tooltip title={copied ? 'Copied!' : 'Copy extension ID'}>
        <IconButton
          size="small"
          onClick={handleCopy}
          style={{ padding: 2, marginRight: 4, opacity: copied ? 1 : 0.5 }}
        >
          {copied
            ? <CheckIcon style={{ fontSize: '0.85rem', color: '#4caf50' }} />
            : <FileCopyOutlinedIcon style={{ fontSize: '0.85rem' }} />}
        </IconButton>
      </Tooltip>
      <TypeChip type={ext.extensionType} className={classes.typeChip} />
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
  const classes = useStyles();
  const enabledCount = extensions.filter(e => getStatus(e) === 'enabled').length;
  const disabledCount = extensions.filter(e => getStatus(e) === 'disabled').length;

  return (
    <Paper className={classes.pluginCard} elevation={1}>
      <div
        className={classes.pluginCardHeader}
        onClick={onToggleCollapse}
        role="button"
        tabIndex={0}
        style={{ cursor: 'pointer' }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onToggleCollapse(); }}
      >
        <ExtensionIcon className={classes.pluginIcon} fontSize="small" />
        <Typography variant="subtitle1" className={classes.pluginTitle}>
          {pluginId}
        </Typography>
        <Typography className={classes.pluginCount}>
          {extensions.length} extensions &nbsp;·&nbsp; {enabledCount} enabled &nbsp;·&nbsp;{' '}
          {disabledCount} disabled
        </Typography>
        <IconButton size="small" style={{ marginLeft: 8 }} onClick={e => { e.stopPropagation(); onToggleCollapse(); }}>
          {isCollapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
        </IconButton>
      </div>
      <Collapse in={!isCollapsed}>
        <CardContent style={{ padding: 0 }}>
          {extensions.map(ext => (
            <ExtensionRow
              key={ext.id}
              ext={ext}
              onClick={() => onExtensionClick(ext)}
            />
          ))}
        </CardContent>
      </Collapse>
    </Paper>
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
  const classes = useStyles();
  const [sortField, setSortField] = useState<SortField>('pluginId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    return [...extensions].sort((a, b) => {
      let aVal = '';
      let bVal = '';
      if (sortField === 'id') { aVal = a.id; bVal = b.id; }
      else if (sortField === 'pluginId') { aVal = a.pluginId; bVal = b.pluginId; }
      else if (sortField === 'extensionType') { aVal = a.extensionType; bVal = b.extensionType; }
      else if (sortField === 'status') { aVal = getStatus(a); bVal = getStatus(b); }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [extensions, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const col = (field: SortField, label: string) => (
    <TableSortLabel
      active={sortField === field}
      direction={sortField === field ? sortDir : 'asc'}
      onClick={() => handleSort(field)}
    >
      {label}
    </TableSortLabel>
  );

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{col('id', 'Extension ID')}</TableCell>
            <TableCell>{col('pluginId', 'Plugin')}</TableCell>
            <TableCell>{col('extensionType', 'Type')}</TableCell>
            <TableCell>{col('status', 'Status')}</TableCell>
            <TableCell>Attach To</TableCell>
            <TableCell>Config</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map(ext => (
            <TableRow
              key={ext.id}
              hover
              className={classes.tableRow}
              onClick={() => onRowClick(ext)}
            >
              <TableCell className={classes.tableIdCell}>{ext.id}</TableCell>
              <TableCell>
                <Typography style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {ext.pluginId}
                </Typography>
              </TableCell>
              <TableCell>
                <TypeChip type={ext.extensionType} />
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gridGap={4}>
                  <StatusIcon ext={ext} />
                  <StatusChip ext={ext} className={classes.statusChip} />
                </Box>
              </TableCell>
              <TableCell>
                <Typography
                  variant="caption"
                  style={{ fontFamily: 'monospace' }}
                >
                  {ext.attachToId || '—'}
                  {ext.attachToInput && ` → ${ext.attachToInput}`}
                </Typography>
              </TableCell>
              <TableCell>
                {ext.config !== undefined && ext.config !== null ? (
                  <Tooltip title={<pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>{formatJson(ext.config)}</pre>}>
                    <Chip size="small" label="View" variant="outlined" style={{ cursor: 'pointer', height: 22 }} />
                  </Tooltip>
                ) : (
                  <Typography variant="caption" color="textSecondary">
                    —
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function FrontendExtensionsExplorerPage() {
  const classes = useStyles();
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
      <Header
        title="Frontend Extensions Explorer"
        subtitle="Inspect all New Frontend System extensions loaded in this app"
      />
      <Content>
        <ContentHeader title="" />

        <StatsBar extensions={allExtensions} plugins={allPlugins} />

        {/* Filter bar */}
        <div className={classes.filtersContainer}>
          <TextField
            className={classes.searchField}
            variant="outlined"
            size="small"
            placeholder="Search by extension ID or plugin…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <FormControl variant="outlined" size="small" className={classes.filterSelect}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filterType}
              onChange={e => setFilterType(e.target.value as string)}
              label="Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              {allTypes.map(t => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" className={classes.filterSelect}>
            <InputLabel>Plugin</InputLabel>
            <Select
              value={filterPlugin}
              onChange={e => setFilterPlugin(e.target.value as string)}
              label="Plugin"
            >
              <MenuItem value="all">All Plugins</MenuItem>
              {allPlugins.map(p => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" className={classes.filterSelect}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as string)}
              label="Status"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="enabled">Enabled</MenuItem>
              <MenuItem value="disabled">Disabled</MenuItem>
              <MenuItem value="not-running">Not Running</MenuItem>
            </Select>
          </FormControl>

          <ToggleButtonGroup
            className={classes.viewToggle}
            value={viewMode}
            exclusive
            onChange={(_e, v) => { if (v) setViewMode(v); }}
            size="small"
          >
            <ToggleButton value="cards" aria-label="card view">
              <Tooltip title="Plugin Card View">
                <DashboardIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="table" aria-label="table view">
              <Tooltip title="Flat Table View">
                <ViewListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        {filtered.length === 0 && (
          <Paper style={{ padding: 32, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No extensions match the current filters.
            </Typography>
          </Paper>
        )}
        {filtered.length > 0 && viewMode === 'cards' && (
          <>
            <Box display="flex" alignItems="center" gridGap={8} mb={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<UnfoldLessIcon fontSize="small" />}
                onClick={collapseAll}
              >
                Collapse All
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<UnfoldMoreIcon fontSize="small" />}
                onClick={expandAll}
              >
                Expand All
              </Button>
            </Box>
            <Grid container spacing={0} direction="column">
              {pluginGroups.map(([pluginId, exts]) => (
                <Grid item key={pluginId}>
                  <PluginCard
                    pluginId={pluginId}
                    extensions={exts}
                    onExtensionClick={setSelectedExt}
                    isCollapsed={collapsedPlugins.has(pluginId)}
                    onToggleCollapse={() => togglePlugin(pluginId)}
                  />
                </Grid>
              ))}
            </Grid>
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
