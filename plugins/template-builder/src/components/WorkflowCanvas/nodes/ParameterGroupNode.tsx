import { Handle, Position } from '@xyflow/react';
import { Badge, Box, Text, Tooltip, TooltipTrigger } from '@backstage/ui';
import { RiLoginBoxLine } from '@remixicon/react';
import styles from './nodes.module.css';

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
  const isHorizontal = data.layoutDirection === 'horizontal';

  return (
    <Box className={`${styles.paramGroupOuter} parameter-group-node`}>
      {/* Main handle for "all parameters" connections */}
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        id="all"
        style={{
          position: 'absolute',
          ...(isHorizontal
            ? {
                // RIGHT border in horizontal mode
                right: '0px',
                top: '50%',
                transform: 'translate(50%, -50%)',
              }
            : {
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

      <Box className={styles.paramGroupInnerContent}>
        <Box className={styles.paramGroupHeader}>
          <RiLoginBoxLine style={{ fontSize: '1.2rem', color: 'var(--bui-fg-announcement)' }} />
          <Text variant="body-medium" weight="bold">
            Template Parameters
          </Text>
          {data.totalUsageCount > 0 && (
            <Badge className={styles.countChip}>{`${data.totalUsageCount} reference${data.totalUsageCount !== 1 ? 's' : ''}`}</Badge>
          )}
        </Box>

        <Box
          className={styles.groupList}
          style={{
            flexDirection: data.layoutDirection === 'horizontal' ? 'column' : 'row',
            flexWrap: data.layoutDirection === 'vertical' ? 'wrap' : 'nowrap',
            justifyContent: data.layoutDirection === 'vertical' ? 'center' : 'flex-start',
            alignItems: data.layoutDirection === 'horizontal' ? 'flex-start' : 'center',
          }}
        >
          {data.parameters.map(param => (
            <Box key={param.name} className={styles.chipWrapper}>
              <TooltipTrigger>
                <Badge className={styles.paramChip}>{param.title}</Badge>
                <Tooltip>{`${param.name} (used ${param.usageCount}×)`}</Tooltip>
              </TooltipTrigger>
              {/* Handle position changes based on layout direction */}
              <Handle
                type="source"
                position={isHorizontal ? Position.Right : Position.Bottom}
                id={`param-${param.name}`}
                style={{
                  position: 'absolute',
                  ...(isHorizontal
                    ? {
                        // RIGHT side in horizontal mode
                        right: '-6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }
                    : {
                        // BOTTOM in vertical mode
                        left: '50%',
                        bottom: '-6px',
                        transform: 'translateX(-50%)',
                      }),
                  zIndex: 100,
                  pointerEvents: 'all',
                  width: '10px',
                  height: '10px',
                  background: '#9c27b0',
                  border: '2px solid white',
                  boxShadow: '0 0 4px rgba(0,0,0,0.3)',
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
