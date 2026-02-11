import { Handle, Position } from '@xyflow/react';
import { Box, Typography, IconButton, Chip, Tooltip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import DeleteIcon from '@material-ui/icons/Delete';
import ErrorIcon from '@material-ui/icons/Error';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import type { ActionNodeData } from '../../../types';

const useStyles = makeStyles(theme => ({
  node: {
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.type === 'dark' ? '#1a1a2e' : theme.palette.background.paper,
    border: `2px solid ${theme.palette.primary.main}`,
    minWidth: 120,
    maxWidth: 180,
    boxShadow: theme.shadows[2],
    cursor: 'pointer',
    '&:hover': {
      boxShadow: theme.shadows[4],
      transform: 'scale(1.02)',
    },
    transition: 'all 0.2s',
  },
  conditionalNode: {
    borderStyle: 'dashed',
    borderWidth: 3,
    opacity: 0.85,
  },
  nodeError: {
    borderColor: theme.palette.error.main,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(0.5),
  },
  actionId: {
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.25),
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  errorIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    color: theme.palette.error.main,
    fontSize: '0.75rem',
    marginTop: theme.spacing(0.5),
  },
  conditionalIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    color: theme.palette.warning.main,
    fontSize: '0.65rem',
    marginTop: theme.spacing(0.5),
  },
}));

export interface ActionNodeProps {
  data: ActionNodeData & { onDelete?: () => void };
  selected: boolean;
}

export function ActionNode({ data, selected }: any) {
  const classes = useStyles();
  const hasErrors = false; // TODO: Connect to validation
  const nodeData = data as ActionNodeData & { onDelete?: () => void };
  const isConditional = Boolean(nodeData.if);
  const isHorizontal = nodeData.layoutDirection === 'horizontal';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData.onDelete) {
      nodeData.onDelete();
    }
  };

  return (
    <Box 
      className={`${classes.node} ${hasErrors ? classes.nodeError : ''} ${isConditional ? classes.conditionalNode : ''}`}
    >
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        id="input"
        style={{ background: '#555' }}
        isConnectable={false}
      />

      <Box className={classes.header}>
        <Box flex={1}>
          <Typography variant="body2" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {nodeData.name}
          </Typography>
          <Typography className={classes.actionId} title={nodeData.actionId}>
            {nodeData.actionId}
          </Typography>
        </Box>
        {selected && (
          <IconButton
            size="small"
            onClick={handleDelete}
            title="Delete this step"
            style={{ padding: 4 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {Object.keys(nodeData.inputs || {}).length > 0 && (
        <Box mt={0.25}>
          <Chip
            label={`${Object.keys(nodeData.inputs).length} input${Object.keys(nodeData.inputs).length !== 1 ? 's' : ''}`}
            size="small"
            variant="outlined"
            style={{ height: 20, fontSize: '0.7rem' }}
          />
        </Box>
      )}

      {isConditional && (
        <Tooltip title={`Conditional: ${nodeData.if}`} placement="top">
          <Box className={classes.conditionalIndicator}>
            <HelpOutlineIcon style={{ fontSize: '0.9rem' }} />
            <Typography variant="caption" style={{ fontSize: '0.65rem' }}>
              Conditional
            </Typography>
          </Box>
        </Tooltip>
      )}

      {hasErrors && (
        <Box className={classes.errorIndicator}>
          <ErrorIcon fontSize="small" />
          <Typography variant="caption">Configuration error</Typography>
        </Box>
      )}

      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        id="output"
        style={{ background: '#555' }}
        isConnectable={false}
      />
    </Box>
  );
}

export default ActionNode;
