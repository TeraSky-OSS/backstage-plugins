import { Handle, Position } from '@xyflow/react';
import { Badge, Box, Text } from '@backstage/ui';
import { RiArrowRightUpLine } from '@remixicon/react';
import styles from './nodes.module.css';

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
  return (
    <Box className={styles.outputNode}>
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{ background: '#4caf50' }}
        isConnectable={false}
      />

      <Box className={styles.nodeHeader}>
        <RiArrowRightUpLine style={{ fontSize: '0.9rem', color: 'var(--bui-fg-positive)' }} />
        <Text variant="body-small" weight="bold">
          Output
        </Text>
      </Box>

      <Text variant="body-small" color="secondary" truncate title={data.stepId}>
        {data.stepName}
      </Text>

      {data.outputKeys.length > 0 && (
        <Box mt="1">
          <Badge>{`${data.outputKeys.length} field${data.outputKeys.length !== 1 ? 's' : ''}`}</Badge>
        </Box>
      )}

      {data.usageCount > 0 && (
        <Box mt="1">
          <Badge>{`Used ${data.usageCount}×`}</Badge>
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
