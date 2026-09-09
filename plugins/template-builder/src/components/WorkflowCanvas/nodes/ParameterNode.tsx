import { Handle, Position } from '@xyflow/react';
import { Badge, Box, Text } from '@backstage/ui';
import { RiLoginBoxLine } from '@remixicon/react';
import styles from './nodes.module.css';

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
  return (
    <Box className={styles.paramNode}>
      <Box className={styles.nodeHeader}>
        <RiLoginBoxLine style={{ fontSize: '1rem', color: 'var(--bui-fg-secondary)' }} />
        <Text variant="body-small" weight="bold">
          {data.paramTitle}
        </Text>
      </Box>
      <Text variant="body-small" color="secondary" truncate title={data.paramName}>
        {data.paramName}
      </Text>
      {data.usageCount > 0 && (
        <Box mt="1">
          <Badge>{`Used ${data.usageCount}×`}</Badge>
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
