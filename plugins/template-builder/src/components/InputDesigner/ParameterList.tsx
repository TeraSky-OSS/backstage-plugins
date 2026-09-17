import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Badge,
  Box,
  ButtonIcon,
  Card,
  Flex,
  Text,
  TextAreaField,
  TextField,
} from '@backstage/ui';
import { RiDeleteBinLine } from '@remixicon/react';
import type { ParameterStep } from '../../types';
import styles from './ParameterList.module.css';

export interface ParameterListProps {
  step: ParameterStep;
  stepIndex: number;
  selectedField?: string;
  onSelectField: (fieldName: string) => void;
  onDeleteField: (fieldName: string) => void;
  onUpdateStep: (updates: Partial<ParameterStep>) => void;
}

export function ParameterList(props: ParameterListProps) {
  const { step, selectedField, onSelectField, onDeleteField, onUpdateStep } = props;

  const fields = Object.entries(step.properties);
  const isRequired = (fieldName: string) => step.required.includes(fieldName);

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Box p="4">
          <TextField
            label="Step Title"
            value={step.title}
            onChange={value => onUpdateStep({ title: value })}
            size="small"
          />
          <Box mt="2">
            <TextAreaField
              label="Description"
              value={step.description || ''}
              onChange={value => onUpdateStep({ description: value })}
              rows={2}
            />
          </Box>

          <Box mt="1">
            <Accordion>
              <AccordionTrigger>
                <Text variant="title-x-small" weight="bold">
                  Conditional Fields (dependencies)
                </Text>
              </AccordionTrigger>
              <AccordionPanel>
                <Box width="100%">
                  <Text as="div" variant="body-small" color="secondary">
                    Use JSON Schema dependencies to show/hide fields based on other field
                    values. Example: Show field B only when field A has a specific value.
                  </Text>
                  <Text as="div" variant="body-small" color="secondary">
                    <strong>Example structure:</strong>
                    <pre className={styles.exampleBlock}>
{`{
  "fieldName": {
    "oneOf": [
      {
        "properties": {
          "fieldName": { "enum": ["value1"] }
        }
      },
      {
        "properties": {
          "fieldName": { "enum": ["value2"] },
          "conditionalField": {
            "type": "string",
            "title": "Only shown when value2"
          }
        },
        "required": ["conditionalField"]
      }
    ]
  }
}`}
                    </pre>
                  </Text>
                  <Box mt="2" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    <TextAreaField
                      value={step.dependencies ? JSON.stringify(step.dependencies, null, 2) : '{}'}
                      onChange={value => {
                        try {
                          const parsed = JSON.parse(value);
                          onUpdateStep({ dependencies: Object.keys(parsed).length > 0 ? parsed : undefined });
                        } catch {
                          // Invalid JSON, don't update
                        }
                      }}
                      placeholder="{}"
                      description="Enter valid JSON for conditional field dependencies"
                      rows={4}
                    />
                  </Box>
                </Box>
              </AccordionPanel>
            </Accordion>
          </Box>
        </Box>

        <Box style={{ borderTop: '1px solid var(--bui-border-1)', paddingTop: 'var(--bui-space-1)' }}>
          {fields.length > 0 ? (
            <Flex direction="column" gap="1" p="2">
              {fields.map(([fieldName, field]) => (
                <Flex
                  key={fieldName}
                  align="center"
                  justify="between"
                  className={`${styles.fieldRow} ${
                    selectedField === fieldName ? styles.fieldRowSelected : ''
                  }`}
                  onClick={() => onSelectField(fieldName)}
                >
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Flex align="center" gap="2">
                      <Text variant="body-medium">{field.title}</Text>
                      {isRequired(fieldName) && <Badge size="small">Required</Badge>}
                      <Badge size="small">{field.uiField || field.type}</Badge>
                    </Flex>
                    {field.description && (
                      <Text as="div" variant="body-small" color="secondary">
                        {field.description}
                      </Text>
                    )}
                  </Box>
                  <Box onClick={e => e.stopPropagation()}>
                    <ButtonIcon
                      aria-label={`Delete field ${fieldName}`}
                      icon={<RiDeleteBinLine />}
                      size="small"
                      variant="tertiary"
                      onPress={() => onDeleteField(fieldName)}
                    />
                  </Box>
                </Flex>
              ))}
            </Flex>
          ) : (
            <Box p="3" style={{ textAlign: 'center' }}>
              <Text variant="body-small" color="secondary">
                No fields defined. Click "Add Field" to create one.
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  );
}
