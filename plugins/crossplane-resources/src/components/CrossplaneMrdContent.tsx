import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  makeStyles,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import DescriptionIcon from '@material-ui/icons/Description';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import GetAppIcon from '@material-ui/icons/GetApp';
import SearchIcon from '@material-ui/icons/Search';
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

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  toolbar: {
    display: 'flex',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  searchField: {
    minWidth: 240,
    flex: 1,
  },
  filterSelect: {
    minWidth: 160,
  },
  tableContainer: {
    backgroundColor:
      theme.palette.type === 'dark' ? theme.palette.background.paper : '#ffffff',
    border: `1px solid ${
      theme.palette.type === 'dark' ? theme.palette.grey[700] : theme.palette.grey[400]
    }`,
    borderRadius: '4px',
    boxShadow:
      theme.palette.type === 'dark'
        ? '0 1px 3px rgba(0,0,0,0.4)'
        : '0 1px 3px rgba(0,0,0,0.1)',
  },
  headerCell: {
    fontWeight: 'bold',
    backgroundColor:
      theme.palette.type === 'dark' ? theme.palette.background.paper : '#ffffff',
    borderBottom: `1px solid ${
      theme.palette.type === 'dark' ? theme.palette.grey[700] : theme.palette.grey[400]
    }`,
    color: theme.palette.text.primary,
  },
  tableCell: {
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${
      theme.palette.type === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300]
    }`,
    color: theme.palette.text.primary,
  },
  clickableRow: {
    '&:hover': { backgroundColor: theme.palette.action.hover, cursor: 'pointer' },
  },
  stateChipActive: {
    backgroundColor:
      theme.palette.type === 'dark' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)',
    color: theme.palette.type === 'dark' ? '#81c784' : '#2e7d32',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  stateChipInactive: {
    backgroundColor:
      theme.palette.type === 'dark' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)',
    color: theme.palette.type === 'dark' ? '#e57373' : '#c62828',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  scopeChipNamespaced: {
    backgroundColor:
      theme.palette.type === 'dark' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.1)',
    color: theme.palette.type === 'dark' ? '#64b5f6' : '#1565c0',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  scopeChipCluster: {
    backgroundColor:
      theme.palette.type === 'dark' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)',
    color: theme.palette.type === 'dark' ? '#ffb74d' : '#e65100',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  drawerPaper: {
    width: 720,
    maxWidth: '92vw',
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
  },
  drawerTabBar: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
  },
  drawerContent: {
    overflow: 'auto',
    flex: 1,
  },
  rawYamlActions: {
    display: 'flex',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  summaryChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  summaryChip: {
    borderRadius: 4,
  },
}));

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
  const classes = useStyles();

  const [items, setItems] = useState<ManagedResourceDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'All' | 'Namespaced' | 'Cluster'>('All');
  const [stateFilter, setStateFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [selectedMrd, setSelectedMrd] = useState<ManagedResourceDefinition | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState(0);
  const [yamlCopySuccess, setYamlCopySuccess] = useState(false);

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
    setDrawerTab(0);
    setYamlCopySuccess(false);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedMrd(null);
  };

  const getRawYaml = (mrd: ManagedResourceDefinition) => yaml.dump(mrd, { indent: 2 });

  const handleYamlCopy = () => {
    if (!selectedMrd) return;
    navigator.clipboard.writeText(getRawYaml(selectedMrd)).then(() => {
      setYamlCopySuccess(true);
      setTimeout(() => setYamlCopySuccess(false), 2000);
    });
  };

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
        <CardContent>
          <Typography variant="body2" color="textSecondary">
            You do not have permission to view Managed Resource Definitions.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box className={classes.root}>
      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography variant="body2" color="error" gutterBottom>
          {error}
        </Typography>
      )}

      {!loading && !error && (
        <>
          {/* ── Summary chips ── */}
          <Box className={classes.summaryChips}>
            <Chip
              label={`Total: ${summary.total}`}
              className={classes.summaryChip}
              variant="outlined"
            />
            <Chip
              label={`Namespaced: ${summary.namespacedCount}`}
              className={classes.summaryChip}
              style={{ borderColor: '#2196f3', color: '#2196f3' }}
              variant="outlined"
            />
            <Chip
              label={`Cluster Scoped: ${summary.clusterScopedCount}`}
              className={classes.summaryChip}
              style={{ borderColor: '#ff9800', color: '#ff9800' }}
              variant="outlined"
            />
            <Chip
              label={`Active: ${summary.activeCount}`}
              className={classes.summaryChip}
              style={{ borderColor: '#4caf50', color: '#4caf50' }}
              variant="outlined"
            />
            <Chip
              label={`Inactive: ${summary.inactiveCount}`}
              className={classes.summaryChip}
              style={{ borderColor: '#f44336', color: '#f44336' }}
              variant="outlined"
            />
          </Box>

          {/* ── Toolbar: search + filters ── */}
          <Box className={classes.toolbar}>
            <TextField
              className={classes.searchField}
              size="small"
              placeholder="Search by name, kind, group..."
              variant="outlined"
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
              <InputLabel>Scope</InputLabel>
              <Select
                value={scopeFilter}
                onChange={e => setScopeFilter(e.target.value as typeof scopeFilter)}
                label="Scope"
              >
                <MenuItem value="All">All Scopes</MenuItem>
                <MenuItem value="Namespaced">Namespaced</MenuItem>
                <MenuItem value="Cluster">Cluster Scoped</MenuItem>
              </Select>
            </FormControl>
            <FormControl variant="outlined" size="small" className={classes.filterSelect}>
              <InputLabel>State</InputLabel>
              <Select
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value as typeof stateFilter)}
                label="State"
              >
                <MenuItem value="All">All States</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            {(search || scopeFilter !== 'All' || stateFilter !== 'All') && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setSearch('');
                  setScopeFilter('All');
                  setStateFilter('All');
                }}
              >
                Clear Filters
              </Button>
            )}
          </Box>

          {/* ── Table ── */}
          <TableContainer component={Paper} className={classes.tableContainer}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell className={classes.headerCell}>Name</TableCell>
                  <TableCell className={classes.headerCell}>Kind</TableCell>
                  <TableCell className={classes.headerCell}>Group</TableCell>
                  <TableCell className={classes.headerCell}>Plural</TableCell>
                  <TableCell className={classes.headerCell}>Scope</TableCell>
                  <TableCell className={classes.headerCell}>State</TableCell>
                  <TableCell className={classes.headerCell}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className={classes.tableCell} align="center">
                      <Typography variant="body2" color="textSecondary">
                        {items.length === 0
                          ? 'No Managed Resource Definitions found.'
                          : 'No results match the current filters.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(mrd => (
                  <TableRow
                    key={mrd.metadata?.uid || mrd.metadata?.name}
                    className={classes.clickableRow}
                    onClick={() => openDrawer(mrd)}
                  >
                    <TableCell className={classes.tableCell}>
                      <Typography variant="body2">{mrd.metadata?.name}</Typography>
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                      <Typography variant="body2">{mrd.spec?.names?.kind}</Typography>
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                      <Typography variant="body2">{mrd.spec?.group}</Typography>
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                      <Typography variant="body2">{mrd.spec?.names?.plural}</Typography>
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                      <Chip
                        label={mrd.spec?.scope}
                        size="small"
                        className={
                          mrd.spec?.scope === 'Namespaced'
                            ? classes.scopeChipNamespaced
                            : classes.scopeChipCluster
                        }
                      />
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                      <Chip
                        label={mrd.spec?.state ?? 'Unknown'}
                        size="small"
                        className={
                          mrd.spec?.state === 'Active'
                            ? classes.stateChipActive
                            : classes.stateChipInactive
                        }
                      />
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                      <Tooltip title="View Definition">
                        <IconButton
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            openDrawer(mrd);
                          }}
                        >
                          <DescriptionIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography
            variant="caption"
            color="textSecondary"
            style={{ marginTop: 8, display: 'block' }}
          >
            Showing {filtered.length} of {items.length} MRDs
          </Typography>
        </>
      )}

      {/* ── Detail Drawer ── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        classes={{ paper: classes.drawerPaper }}
      >
        {selectedMrd && (
          <>
            {/* Drawer header */}
            <Box className={classes.drawerHeader}>
              <Box>
                <Typography variant="h6">{selectedMrd.metadata?.name}</Typography>
                <Box display="flex" mt={0.5} style={{ gap: 8 }}>
                  <Chip
                    label={selectedMrd.spec?.scope}
                    size="small"
                    className={
                      selectedMrd.spec?.scope === 'Namespaced'
                        ? classes.scopeChipNamespaced
                        : classes.scopeChipCluster
                    }
                  />
                  <Chip
                    label={selectedMrd.spec?.state ?? 'Unknown'}
                    size="small"
                    className={
                      selectedMrd.spec?.state === 'Active'
                        ? classes.stateChipActive
                        : classes.stateChipInactive
                    }
                  />
                </Box>
              </Box>
              <IconButton size="small" onClick={closeDrawer}>
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Tab bar */}
            <Tabs
              value={drawerTab}
              onChange={(_, v) => setDrawerTab(v)}
              indicatorColor="primary"
              textColor="primary"
              className={classes.drawerTabBar}
            >
              <Tab label="Schema Explorer" />
              <Tab label="Raw YAML" />
            </Tabs>

            {/* Tab: Schema Explorer (MrdDefinitionWidget) */}
            {drawerTab === 0 && (
              <Box className={classes.drawerContent}>
                <MrdDefinitionWidget mrd={selectedMrd} />
              </Box>
            )}

            {/* Tab: Raw YAML */}
            {drawerTab === 1 && (
              <>
                <Box className={classes.rawYamlActions}>
                  <Tooltip title={yamlCopySuccess ? 'Copied!' : 'Copy YAML'}>
                    <IconButton size="small" onClick={handleYamlCopy}>
                      <FileCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download YAML">
                    <IconButton size="small" onClick={handleYamlDownload}>
                      <GetAppIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box className={classes.drawerContent} style={{ padding: 16 }}>
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
              </>
            )}
          </>
        )}
      </Drawer>
    </Box>
  );
};

export default CrossplaneMrdContent;
