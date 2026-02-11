import { Handle, Position } from '@xyflow/react';
import { Box, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';

const useStyles = makeStyles(theme => ({
  node: {
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
    minWidth: 120,
    textAlign: 'center',
    boxShadow: theme.shadows[2],
  },
  icon: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: theme.spacing(0.5),
  },
}));

export function StartNode() {
  const classes = useStyles();

  return (
    <Box className={classes.node}>
      <Box className={classes.icon}>
        <PlayArrowIcon />
      </Box>
      <Typography variant="body2" style={{ fontWeight: 600 }}>
        Start
      </Typography>
      <Handle
        type="source"
        position={Position.Right}
        id="start-output"
        style={{ background: '#555' }}
        isConnectable={false}
      />
    </Box>
  );
}

export default StartNode;
