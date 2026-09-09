import { Box, ButtonIcon, Flex, Select, Text, TextField } from '@backstage/ui';
import { RiCloseLine } from '@remixicon/react';
import type { ActionNodeData, ParameterStep, PropertySchema } from '../../types';

export interface ActionConfigPanelProps {
  action: ActionNodeData;
  nodeId: string;
  actionSchema?: {
    input?: {
      properties?: Record<string, PropertySchema>;
      required?: string[];
    };
    output?: {
      properties?: Record<string, PropertySchema>;
    };
  };
  parameters: ParameterStep[];
  previousSteps: Array<{ id: string; name: string }>;
  onUpdateInputs: (inputs: Record<string, any>) => void;
  onUpdateName: (name: string) => void;
  onUpdateId: (id: string) => void;
  onClose: () => void;
}

export function ActionConfigPanel(props: ActionConfigPanelProps) {
  const { action, nodeId, actionSchema, parameters, previousSteps, onUpdateInputs, onUpdateName, onUpdateId, onClose } = props;

  const inputProperties = actionSchema?.input?.properties || {};
  const requiredInputs = actionSchema?.input?.required || [];

  const availableVariables = [
    ...parameters.flatMap(step =>
      Object.keys(step.properties).map(fieldName => ({
        label: `parameters.${fieldName}`,
        value: `\${{ parameters.${fieldName} }}`,
      }))
    ),
    ...previousSteps.map(step => ({
      label: `steps.${step.id}.output`,
      value: `\${{ steps.${step.id}.output }}`,
    })),
  ];

  const handleInputChange = (inputName: string, value: any) => {
    const newInputs = { ...action.inputs, [inputName]: value };
    onUpdateInputs(newInputs);
  };

  return (
    <Flex
      direction="column"
      style={{ height: '100%' }}
    >
      <Flex
        justify="between"
        align="start"
        style={{
          padding: 'var(--bui-space-4)',
          borderBottom: '1px solid var(--bui-border-1)',
        }}
      >
        <Box style={{ flexGrow: 1 }}>
          <TextField
            value={action.name}
            onChange={onUpdateName}
            placeholder="Step name"
          />
          <Box style={{ marginTop: 'var(--bui-space-1)' }}>
            <TextField
              value={nodeId}
              onChange={onUpdateId}
              placeholder="Step ID (e.g., fetch-template)"
              description="Used to reference this step's outputs in subsequent steps"
            />
          </Box>
          <Text as="p" variant="body-small" color="secondary" style={{ marginTop: 'var(--bui-space-1)' }}>
            Action: {action.actionId}
          </Text>
        </Box>
        <ButtonIcon aria-label="Close" icon={<RiCloseLine />} size="small" variant="tertiary" onPress={onClose} />
      </Flex>

      <Box style={{ flex: 1, overflow: 'auto', padding: 'var(--bui-space-4)' }}>
        {Object.keys(inputProperties).length > 0 ? (
          <>
            <Text as="p" variant="title-x-small" weight="bold" style={{ marginTop: 'var(--bui-space-2)', marginBottom: 'var(--bui-space-1)' }}>
              Configure Inputs
            </Text>
            <Text as="p" variant="body-small" color="secondary" style={{ marginBottom: 'var(--bui-space-2)' }}>
              Map values from parameters or previous steps, or enter static values.
            </Text>

            {Object.entries(inputProperties).map(([inputName, schema]) => {
              const isRequired = requiredInputs.includes(inputName);
              const currentValue = action.inputs?.[inputName] || '';

              return (
                <Box key={inputName} style={{ marginBottom: 'var(--bui-space-6)' }}>
                  <Text as="p" variant="body-small" weight="bold">
                    {schema.title || inputName}
                    {isRequired && <Text as="span" color="secondary" style={{ color: 'var(--bui-fg-negative)' }}> *</Text>}
                  </Text>
                  {schema.description && (
                    <Text as="p" variant="body-small" color="secondary">
                      {schema.description}
                    </Text>
                  )}

                  {availableVariables.length > 0 && (
                    <Box style={{ marginTop: 'var(--bui-space-1)', marginBottom: 'var(--bui-space-1)' }}>
                      <Select
                        label="Quick Select Variable"
                        placeholder="Select a variable..."
                        selectedKey={null}
                        onSelectionChange={key => key && handleInputChange(inputName, key as string)}
                        size="small"
                        options={availableVariables.map(variable => ({
                          id: variable.value,
                          label: variable.label,
                        }))}
                      />
                    </Box>
                  )}

                  <TextField
                    value={currentValue}
                    onChange={val => handleInputChange(inputName, val)}
                    placeholder={schema.type === 'string' ? 'Enter value or expression' : 'Enter value'}
                    size="small"
                    description="Use ${{ }} for expressions (e.g., ${{ parameters.name }})"
                  />

                  <div style={{ marginTop: 'var(--bui-space-4)', borderBottom: '1px solid var(--bui-border-1)' }} />
                </Box>
              );
            })}
          </>
        ) : (
          <Box style={{ textAlign: 'center', padding: 'var(--bui-space-8) 0' }}>
            <Text as="p" variant="body-small" color="secondary">
              This action has no configurable inputs.
            </Text>
          </Box>
        )}

        {actionSchema?.output?.properties && Object.keys(actionSchema.output.properties).length > 0 && (
          <>
            <Text as="p" variant="title-x-small" weight="bold" style={{ marginTop: 'var(--bui-space-2)', marginBottom: 'var(--bui-space-1)' }}>
              Expected Outputs
            </Text>
            <Text as="p" variant="body-small" color="secondary">
              This action produces the following outputs that can be referenced in subsequent steps:
            </Text>

            <Box style={{ marginTop: 'var(--bui-space-1)', marginBottom: 'var(--bui-space-2)' }}>
              {Object.entries(actionSchema.output.properties).map(([propName, propSchema]: [string, any]) => (
                <Box key={propName} style={{ marginBottom: 'var(--bui-space-1)' }}>
                  <Text as="p" variant="body-small" weight="bold">
                    {propName}
                    {propSchema.type && (
                      <Text as="span" variant="body-small" color="secondary" style={{ marginLeft: 'var(--bui-space-1)' }}>
                        ({propSchema.type})
                      </Text>
                    )}
                  </Text>
                  {propSchema.description && (
                    <Text as="p" variant="body-small" color="secondary">
                      {propSchema.description}
                    </Text>
                  )}
                  <Box
                    style={{
                      marginTop: 'var(--bui-space-0.5)',
                      padding: 'var(--bui-space-0.5)',
                      backgroundColor: 'var(--bui-bg-neutral-2)',
                      borderRadius: 'var(--bui-radius-1)',
                    }}
                  >
                    <Text as="span" variant="body-small" style={{ fontFamily: 'monospace' }}>
                      {`\${{ steps.${nodeId}.output.${propName} }}`}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Box>
    </Flex>
  );
}
