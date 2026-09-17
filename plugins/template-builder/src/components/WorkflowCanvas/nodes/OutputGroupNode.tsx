import { Handle, Position } from '@xyflow/react';
import { Badge, Box, Text, Tooltip, TooltipTrigger } from '@backstage/ui';
import { RiArrowRightUpLine } from '@remixicon/react';
import styles from './nodes.module.css';

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
  const isHorizontal = data.layoutDirection === 'horizontal';

  return (
    <Box className={`${styles.outputGroupOuter} output-group-node`}>
      {/* Main handle for incoming connections from all actions */}
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        id="all"
        style={{
          position: 'absolute',
          ...(isHorizontal
            ? {
                // LEFT border in horizontal mode
                left: '0px',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }
            : {
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

      <Box className={styles.outputGroupInnerContent}>
        <Box className={styles.outputGroupHeader}>
          <RiArrowRightUpLine style={{ fontSize: '1.2rem', color: 'var(--bui-fg-positive)' }} />
          <Text variant="body-medium" weight="bold">
            Template Outputs
          </Text>
          <Badge className={styles.countChip}>{`${data.outputs.length} output${data.outputs.length !== 1 ? 's' : ''}`}</Badge>
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
          {data.outputs.map(output => (
            <Box key={output.title} className={styles.chipWrapper}>
              <TooltipTrigger>
                <Badge className={styles.outputChip}>{output.title}</Badge>
                <Tooltip>
                  {`${output.title}${output.url ? `: ${output.url}` : ''}`}
                  <br />
                  {`References: ${output.stepRefs.join(', ') || 'none'}`}
                </Tooltip>
              </TooltipTrigger>
              {/* Handle position changes based on layout direction */}
              <Handle
                type="target"
                position={isHorizontal ? Position.Left : Position.Top}
                id={`output-${output.title}`}
                style={{
                  position: 'absolute',
                  ...(isHorizontal
                    ? {
                        // LEFT side in horizontal mode
                        left: '-6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }
                    : {
                        // TOP in vertical mode
                        left: '50%',
                        top: '-6px',
                        transform: 'translateX(-50%)',
                      }),
                  zIndex: 100,
                  pointerEvents: 'all',
                  width: '10px',
                  height: '10px',
                  background: '#4caf50',
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

export default OutputGroupNode;
