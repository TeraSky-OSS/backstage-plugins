import { Handle, Position } from '@xyflow/react';
import { Box, Typography, Chip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import InputIcon from '@material-ui/icons/Input';

const useStyles = makeStyles(theme => ({
  outerNode: {
    position: 'relative',
    overflow: 'visible',
    paddingBottom: theme.spacing(2),
    border: `3px solid ${theme.palette.secondary.main}`,
    borderRadius: theme.shape.borderRadius,
    // NO background - fully transparent!
  },
  innerContent: {
    padding: theme.spacing(1.5),
    position: 'relative',
    zIndex: 1,
    paddingBottom: theme.spacing(2), // Extra space for handles at bottom
    // NO background - fully transparent so lines show through!
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
    paddingBottom: theme.spacing(0.5),
    borderBottom: `2px solid ${theme.palette.secondary.main}`,
    backgroundColor: theme.palette.type === 'dark' ? '#1e1e1e' : theme.palette.background.paper,
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  paramsList: {
    display: 'flex',
    gap: theme.spacing(1),
    position: 'relative',
  },
  paramChip: {
    fontSize: '0.75rem',
    height: 28,
    cursor: 'pointer',
    position: 'relative',
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    backgroundColor: theme.palette.type === 'dark' ? '#424242' : '#f5f5f5',
    color: theme.palette.type === 'dark' ? '#e0e0e0' : '#424242',
    border: `1px solid ${theme.palette.type === 'dark' ? '#9c27b0' : theme.palette.secondary.main}`,
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? '#616161' : theme.palette.secondary.light,
      transform: 'scale(1.05)',
      zIndex: 1,
    },
    transition: 'all 0.2s',
    fontWeight: 600,
  },
  paramHandle: {
    width: 8,
    height: 8,
    backgroundColor: theme.palette.secondary.main,
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

export interface ParameterGroupNodeData {
  type: 'parameter-group';
  parameters: Array<{
    name: string;
    title: string;
    usageCount: number;
  }>;
  totalUsageCount: number;
  layoutDirection?: 'horizontal' | 'vertical';
}

export interface ParameterGroupNodeProps {
  data: ParameterGroupNodeData;
  selected: boolean;
}

export function ParameterGroupNode({ data }: ParameterGroupNodeProps) {
  const classes = useStyles();
  const isHorizontal = data.layoutDirection === 'horizontal';

  return (
    <Box className={`${classes.outerNode} parameter-group-node`}>
      {/* Main handle for "all parameters" connections */}
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        id="all"
        style={{ 
          position: 'absolute',
          ...(isHorizontal ? {
            // RIGHT border in horizontal mode
            right: '0px',
            top: '50%',
            transform: 'translate(50%, -50%)',
          } : {
            // BOTTOM border in vertical mode
            left: '50%',
            bottom: '0px',
            transform: 'translate(-50%, 50%)',
          }),
          background: '#9c27b0',
          width: '14px',
          height: '14px',
          zIndex: 100,
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 0 8px rgba(156, 39, 176, 0.6)',
        }}
        isConnectable={false}
      />

      <Box className={classes.innerContent}>
        <Box className={classes.header}>
          <InputIcon style={{ fontSize: '1.2rem', color: '#9c27b0' }} />
          <Typography variant="body2" style={{ fontWeight: 700, fontSize: '1rem' }}>
            Template Parameters
          </Typography>
          {data.totalUsageCount > 0 && (
            <Chip
              label={`${data.totalUsageCount} reference${data.totalUsageCount !== 1 ? 's' : ''}`}
              size="small"
              color="secondary"
              style={{ height: 20, fontSize: '0.7rem', marginLeft: 'auto', fontWeight: 600 }}
            />
          )}
        </Box>

        <Box 
          className={classes.paramsList}
          style={{
            flexDirection: data.layoutDirection === 'horizontal' ? 'column' : 'row',
            flexWrap: data.layoutDirection === 'vertical' ? 'wrap' : 'nowrap',
            justifyContent: data.layoutDirection === 'vertical' ? 'center' : 'flex-start',
            alignItems: data.layoutDirection === 'horizontal' ? 'flex-start' : 'center',
          }}
        >
          {data.parameters.map(param => (
            <Box 
              key={param.name} 
              className={classes.chipWrapper}
            >
              <Chip
                label={param.title}
                size="small"
                className={classes.paramChip}
                title={`${param.name} (used ${param.usageCount}×)`}
              />
              {/* Handle position changes based on layout direction */}
              <Handle
                type="source"
                position={isHorizontal ? Position.Right : Position.Bottom}
                id={`param-${param.name}`}
                className={classes.paramHandle}
                style={{
                  position: 'absolute',
                  ...(isHorizontal ? {
                    // RIGHT side in horizontal mode
                    right: '-6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  } : {
                    // BOTTOM in vertical mode
                    left: '50%',
                    bottom: '-6px',
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

export default ParameterGroupNode;
