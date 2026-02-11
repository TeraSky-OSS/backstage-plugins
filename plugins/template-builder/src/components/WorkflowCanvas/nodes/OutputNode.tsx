import { Handle, Position } from '@xyflow/react';
import { Box, Typography, Chip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CallMadeIcon from '@material-ui/icons/CallMade';

const useStyles = makeStyles(theme => ({
  node: {
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.type === 'dark' ? '#1a2e1a' : theme.palette.background.paper,
    border: `2px solid ${theme.palette.success.main}`,
    minWidth: 100,
    maxWidth: 150,
    boxShadow: theme.shadows[2],
    cursor: 'pointer',
    '&:hover': {
      boxShadow: theme.shadows[4],
      borderColor: theme.palette.success.dark,
      transform: 'scale(1.02)',
    },
    transition: 'all 0.2s',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
  },
  stepName: {
    fontSize: '0.7rem',
    color: theme.palette.text.secondary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}));

export interface OutputNodeData {
  type: 'output';
  stepId: string;
  stepName: string;
  outputKeys: string[];
  usageCount: number;
}

export interface OutputNodeProps {
  data: OutputNodeData;
  selected: boolean;
}

export function OutputNode({ data }: OutputNodeProps) {
  const classes = useStyles();

  return (
    <Box className={classes.node}>
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{ background: '#4caf50' }}
        isConnectable={false}
      />

      <Box className={classes.header}>
        <CallMadeIcon style={{ fontSize: '0.9rem', color: '#4caf50' }} />
        <Typography variant="body2" style={{ fontWeight: 600, fontSize: '0.8rem' }}>
          Output
        </Typography>
      </Box>
      
      <Typography className={classes.stepName} title={data.stepId}>
        {data.stepName}
      </Typography>

      {data.outputKeys.length > 0 && (
        <Box mt={0.25}>
          <Chip
            label={`${data.outputKeys.length} field${data.outputKeys.length !== 1 ? 's' : ''}`}
            size="small"
            style={{ 
              height: 18, 
              fontSize: '0.65rem',
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
            }}
          />
        </Box>
      )}

      {data.usageCount > 0 && (
        <Box mt={0.25}>
          <Chip
            label={`Used ${data.usageCount}×`}
            size="small"
            color="primary"
            style={{ height: 18, fontSize: '0.65rem' }}
          />
        </Box>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        style={{ background: '#4caf50' }}
        isConnectable={false}
      />
    </Box>
  );
}

export default OutputNode;
