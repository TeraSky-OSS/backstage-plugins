import { Handle, Position } from '@xyflow/react';
import { Box, Typography, Chip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import InputIcon from '@material-ui/icons/Input';

const useStyles = makeStyles(theme => ({
  node: {
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    border: `2px solid ${theme.palette.secondary.main}`,
    minWidth: 100,
    maxWidth: 150,
    boxShadow: theme.shadows[1],
    cursor: 'pointer',
    '&:hover': {
      boxShadow: theme.shadows[3],
      borderColor: theme.palette.secondary.dark,
    },
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
  },
  paramName: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}));

export interface ParameterNodeData {
  type: 'parameter';
  paramName: string;
  paramTitle: string;
  usageCount: number;
}

export interface ParameterNodeProps {
  data: ParameterNodeData;
  selected: boolean;
}

export function ParameterNode({ data }: ParameterNodeProps) {
  const classes = useStyles();

  return (
    <Box className={classes.node}>
      <Box className={classes.header}>
        <InputIcon style={{ fontSize: '1rem', color: '#666' }} />
        <Typography variant="body2" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
          {data.paramTitle}
        </Typography>
      </Box>
      <Typography className={classes.paramName} title={data.paramName}>
        {data.paramName}
      </Typography>
      {data.usageCount > 0 && (
        <Box mt={0.25}>
          <Chip
            label={`Used ${data.usageCount}×`}
            size="small"
            color="secondary"
            style={{ height: 18, fontSize: '0.65rem' }}
          />
        </Box>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        style={{ background: '#9c27b0' }}
        isConnectable={false}
      />
    </Box>
  );
}

export default ParameterNode;
