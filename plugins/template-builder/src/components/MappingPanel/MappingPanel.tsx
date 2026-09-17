import { useMemo } from 'react';
import { Box, Card, CardBody, CardHeader, Flex, Text } from '@backstage/ui';
import { ExpressionBuilder } from './ExpressionBuilder';
import type { ActionNodeData, ParameterStep, PropertySchema } from '../../types';
import styles from './MappingPanel.module.css';

export interface MappingPanelProps {
  action: ActionNodeData;
  actionSchema?: {
    input?: {
      properties?: Record<string, PropertySchema>;
      required?: string[];
    };
  };
  parameters: ParameterStep[];
  previousSteps: Array<{ id: string; name: string }>;
  onUpdateInputs: (inputs: Record<string, any>) => void;
}

export function MappingPanel(props: MappingPanelProps) {
  const { action, actionSchema, parameters, previousSteps, onUpdateInputs } = props;

  const inputProperties = actionSchema?.input?.properties || {};
  const requiredInputs = actionSchema?.input?.required || [];

  const handleInputChange = (inputName: string, value: any) => {
    const newInputs = { ...action.inputs, [inputName]: value };
    onUpdateInputs(newInputs);
  };

  const availableVariables = useMemo(() => {
    const vars: Array<{ label: string; value: string; group: string }> = [];

    // Add parameters
    parameters.forEach(step => {
      Object.keys(step.properties).forEach(fieldName => {
        vars.push({
          label: `parameters.${fieldName}`,
          value: `\${{ parameters.${fieldName} }}`,
          group: 'Parameters',
        });
      });
    });

    // Add previous step outputs
    previousSteps.forEach(step => {
      vars.push({
        label: `steps.${step.id}.output`,
        value: `\${{ steps.${step.id}.output }}`,
        group: 'Step Outputs',
      });
    });

    // Add built-in variables
    vars.push(
      {
        label: 'user.entity.metadata.name',
        value: '\${{ user.entity.metadata.name }}',
        group: 'Built-in',
      },
      {
        label: 'user.ref',
        value: '\${{ user.ref }}',
        group: 'Built-in',
      }
    );

    return vars;
  }, [parameters, previousSteps]);

  if (Object.keys(inputProperties).length === 0) {
    return (
      <Card className={styles.root}>
        <CardHeader className={styles.header}>
          <Text variant="title-small">{action.name}</Text>
          <Text variant="body-small" color="secondary">
            {action.actionId}
          </Text>
        </CardHeader>
        <Flex direction="column" align="center" justify="center" p="8">
          <Text variant="body-medium" color="secondary">
            This action has no configurable inputs
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card className={styles.root}>
      <CardHeader className={styles.header}>
        <Text variant="title-small">{action.name}</Text>
        <Text variant="body-small" color="secondary">
          {action.actionId}
        </Text>
      </CardHeader>

      <CardBody>
        {Object.entries(inputProperties).map(([inputName, schema]) => {
          const isRequired = requiredInputs.includes(inputName);
          const currentValue = action.inputs?.[inputName];

          return (
            <Box key={inputName} mb="4">
              <Text variant="title-x-small">
                {schema.title || inputName}
                {isRequired && (
                  <span style={{ color: 'var(--bui-fg-negative)' }}> *</span>
                )}
              </Text>
              {schema.description && (
                <Text variant="body-small" color="secondary">
                  {schema.description}
                </Text>
              )}

              <Box mt="2">
                <ExpressionBuilder
                  value={currentValue}
                  onChange={value => handleInputChange(inputName, value)}
                  availableVariables={availableVariables}
                  propertyType={schema.type}
                />
              </Box>

              <hr className={styles.divider} />
            </Box>
          );
        })}
      </CardBody>
    </Card>
  );
}
