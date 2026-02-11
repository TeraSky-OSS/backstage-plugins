import { Handle, Position } from '@xyflow/react';
import { Box, Typography, Chip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CallMadeIcon from '@material-ui/icons/CallMade';

const useStyles = makeStyles(theme => ({
  outerNode: {
    position: 'relative',
    overflow: 'visible',
    paddingTop: theme.spacing(2),
    border: `3px solid ${theme.palette.success.main}`,
    borderRadius: theme.shape.borderRadius,
    // NO background - fully transparent!
  },
  innerContent: {
    padding: theme.spacing(1.5),
    position: 'relative',
    zIndex: 1,
    paddingTop: theme.spacing(2), // Extra space for handles at top
    // NO background - fully transparent so lines show through!
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
    paddingBottom: theme.spacing(0.5),
    borderBottom: `2px solid ${theme.palette.success.main}`,
    backgroundColor: theme.palette.type === 'dark' ? '#1a2e1a' : theme.palette.background.paper,
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  outputsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    position: 'relative',
    justifyContent: 'center',
  },
  outputChip: {
    fontSize: '0.75rem',
    height: 28,
    cursor: 'pointer',
    position: 'relative',
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    backgroundColor: theme.palette.type === 'dark' ? '#2d4a2d' : '#e8f5e9',
    color: theme.palette.type === 'dark' ? '#a5d6a7' : '#2e7d32',
    border: `1px solid ${theme.palette.success.main}`,
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? '#3d5a3d' : '#c8e6c9',
      transform: 'scale(1.05)',
      zIndex: 1,
    },
    transition: 'all 0.2s',
    fontWeight: 600,
  },
  outputHandle: {
    width: 8,
    height: 8,
    backgroundColor: theme.palette.success.main,
    border: '2px solid white',
    boxShadow: '0 0 4px rgba(0,0,0,0.3)',
    zIndex: 10,
  },
  chipWrapper: {
    position: 'relative',
    display: 'inline-block',
    zIndex: 1,
    // CRITICAL: This establishes the positioning context for the handle
    height: 'fit-content',
  },
}));

export interface OutputGroupNodeData {
  type: 'output-group';
  outputs: Array<{
    title: string;
    url?: string;
    stepRefs: string[]; // Which steps this output references
  }>;
  layoutDirection?: 'horizontal' | 'vertical';
}

export interface OutputGroupNodeProps {
  data: OutputGroupNodeData;
  selected: boolean;
}

export function OutputGroupNode({ data }: OutputGroupNodeProps) {
  const classes = useStyles();
  const isHorizontal = data.layoutDirection === 'horizontal';

  return (
    <Box className={`${classes.outerNode} output-group-node`}>
      {/* Main handle for incoming connections from all actions */}
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        id="all"
        style={{ 
          position: 'absolute',
          ...(isHorizontal ? {
            // LEFT border in horizontal mode
            left: '0px',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          } : {
            // TOP border in vertical mode
            left: '50%',
            top: '0px',
            transform: 'translate(-50%, -50%)',
          }),
          background: '#4caf50',
          width: '14px',
          height: '14px',
          zIndex: 100,
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 0 8px rgba(76, 175, 80, 0.6)',
        }}
        isConnectable={false}
      />

      <Box className={classes.innerContent}>
        <Box className={classes.header}>
          <CallMadeIcon style={{ fontSize: '1.2rem', color: '#4caf50' }} />
          <Typography variant="body2" style={{ fontWeight: 700, fontSize: '1rem' }}>
            Template Outputs
          </Typography>
          <Chip
            label={`${data.outputs.length} output${data.outputs.length !== 1 ? 's' : ''}`}
            size="small"
            style={{ 
              height: 20, 
              fontSize: '0.7rem', 
              marginLeft: 'auto', 
              fontWeight: 600,
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
            }}
          />
        </Box>

        <Box 
          className={classes.outputsList}
          style={{
            flexDirection: data.layoutDirection === 'horizontal' ? 'column' : 'row',
            flexWrap: data.layoutDirection === 'vertical' ? 'wrap' : 'nowrap',
            justifyContent: data.layoutDirection === 'vertical' ? 'center' : 'flex-start',
            alignItems: data.layoutDirection === 'horizontal' ? 'flex-start' : 'center',
          }}
        >
          {data.outputs.map(output => (
            <Box 
              key={output.title} 
              className={classes.chipWrapper}
            >
              <Chip
                label={output.title}
                size="small"
                className={classes.outputChip}
                title={`${output.title}${output.url ? `: ${output.url}` : ''}\nReferences: ${output.stepRefs.join(', ') || 'none'}`}
              />
              {/* Handle position changes based on layout direction */}
              <Handle
                type="target"
                position={isHorizontal ? Position.Left : Position.Top}
                id={`output-${output.title}`}
                className={classes.outputHandle}
                style={{
                  position: 'absolute',
                  ...(isHorizontal ? {
                    // LEFT side in horizontal mode
                    left: '-6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  } : {
                    // TOP in vertical mode
                    left: '50%',
                    top: '-6px',
                    transform: 'translateX(-50%)',
                  }),
                  zIndex: 100,
                  pointerEvents: 'all',
                  width: '10px',
                  height: '10px',
                }}
                isConnectable={false}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default OutputGroupNode;
