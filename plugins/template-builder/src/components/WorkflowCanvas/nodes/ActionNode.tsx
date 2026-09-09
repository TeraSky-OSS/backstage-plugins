import { Handle, Position } from '@xyflow/react';
import { Badge, Box, ButtonIcon, Text, Tooltip, TooltipTrigger } from '@backstage/ui';
import { RiDeleteBinLine, RiErrorWarningLine, RiQuestionLine } from '@remixicon/react';
import type { ActionNodeData } from '../../../types';
import styles from './nodes.module.css';

export interface ActionNodeProps {
  data: ActionNodeData & { onDelete?: () => void };
  selected: boolean;
}

export function ActionNode({ data, selected }: any) {
  const hasErrors = false; // TODO: Connect to validation
  const nodeData = data as ActionNodeData & { onDelete?: () => void };
  const isConditional = Boolean(nodeData.if);
  const isHorizontal = nodeData.layoutDirection === 'horizontal';

  const handleDelete = () => {
    if (nodeData.onDelete) {
      nodeData.onDelete();
    }
  };

  const nodeClassName = [
    styles.actionNode,
    hasErrors ? styles.actionNodeError : '',
    isConditional ? styles.actionNodeConditional : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Box className={nodeClassName}>
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        id="input"
        style={{ background: '#555' }}
        isConnectable={false}
      />

      <Box className={styles.actionHeader}>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text variant="body-small" weight="bold" truncate>
            {nodeData.name}
          </Text>
          <Text variant="body-x-small" color="secondary" truncate title={nodeData.actionId}>
            {nodeData.actionId}
          </Text>
        </Box>
        {selected && (
          <TooltipTrigger>
            <ButtonIcon
              aria-label="Delete this step"
              icon={<RiDeleteBinLine />}
              size="small"
              variant="tertiary"
              onPress={handleDelete}
            />
            <Tooltip>Delete this step</Tooltip>
          </TooltipTrigger>
        )}
      </Box>

      {Object.keys(nodeData.inputs || {}).length > 0 && (
        <Box mt="1">
          <Badge>{`${Object.keys(nodeData.inputs).length} input${Object.keys(nodeData.inputs).length !== 1 ? 's' : ''}`}</Badge>
        </Box>
      )}

      {isConditional && (
        <TooltipTrigger>
          <Box className={styles.conditionalIndicator}>
            <RiQuestionLine style={{ fontSize: '0.9rem' }} />
            <Text variant="body-x-small">Conditional</Text>
          </Box>
          <Tooltip>{`Conditional: ${nodeData.if}`}</Tooltip>
        </TooltipTrigger>
      )}

      {hasErrors && (
        <Box className={styles.errorIndicator}>
          <RiErrorWarningLine />
          <Text variant="body-x-small">Configuration error</Text>
        </Box>
      )}

      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        id="output"
        style={{ background: '#555' }}
        isConnectable={false}
      />
    </Box>
  );
}

export default ActionNode;
