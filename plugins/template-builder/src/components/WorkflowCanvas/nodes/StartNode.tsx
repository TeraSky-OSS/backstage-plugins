import { Handle, Position } from '@xyflow/react';
import { Box, Text } from '@backstage/ui';
import { RiPlayLine } from '@remixicon/react';
import styles from './nodes.module.css';

export function StartNode() {
  return (
    <Box className={styles.startNode}>
      <Box className={styles.startNodeIcon}>
        <RiPlayLine />
      </Box>
      <Text variant="body-small" weight="bold">
        Start
      </Text>
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
