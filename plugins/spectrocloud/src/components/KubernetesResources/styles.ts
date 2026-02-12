import { makeStyles } from '@material-ui/core/styles';

export const useKubernetesResourcesStyles = makeStyles(theme => ({
  // Filter bar
  filterBar: {
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    alignItems: 'center',
  },
  filterField: {
    minWidth: 200,
  },

  // View mode toggle
  viewModeToggle: {
    marginBottom: theme.spacing(2),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Table styles
  tableContainer: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  tableRow: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  tableCell: {
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1.5),
  },
  tableHeaderCell: {
    border: `1px solid ${theme.palette.divider}`,
    fontWeight: 700,
    fontSize: '0.875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
    padding: theme.spacing(1.5),
    borderBottom: `2px solid ${theme.palette.divider}`,
    whiteSpace: 'nowrap',
  },
  
  // Hierarchy indentation
  indentedRow: {
    paddingLeft: theme.spacing(4),
  },
  expandCell: {
    width: 48,
    padding: theme.spacing(1),
  },

  // Category badges
  workloadBadge: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
  },
  crossplaneClaimBadge: {
    backgroundColor: theme.palette.secondary.main,
    color: theme.palette.secondary.contrastText,
  },
  crossplaneXRBadge: {
    backgroundColor: theme.palette.info.main,
    color: theme.palette.info.contrastText,
  },
  kroBadge: {
    backgroundColor: theme.palette.warning.main,
    color: theme.palette.warning.contrastText,
  },
  crdBadge: {
    backgroundColor: theme.palette.grey[600],
    color: theme.palette.common.white,
  },
  namespaceBadge: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },

  // Graph styles
  graphContainer: {
    height: 600,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
  },
  graphNode: {
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    border: `2px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    minWidth: 150,
  },
  graphNodeLabel: {
    fontWeight: 600,
    marginBottom: theme.spacing(0.5),
  },

  // Grouped view
  groupHeader: {
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
    fontWeight: 700,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
    },
  },
  kindGroupHeader: {
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[800] : theme.palette.grey[50],
    fontWeight: 600,
    paddingLeft: theme.spacing(4),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(6),
    color: theme.palette.text.secondary,
  },

  // Count badge
  countBadge: {
    marginLeft: theme.spacing(1),
    fontWeight: 'normal',
  },
}));
