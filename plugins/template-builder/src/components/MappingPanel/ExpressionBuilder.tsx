import { useState } from 'react';
import {
  Box,
  Flex,
  Text,
  TextField,
  TextAreaField,
  NumberField,
  Tag,
  TagGroup,
  ToggleButton,
  ToggleButtonGroup,
} from '@backstage/ui';
import { RiCodeLine, RiFunctionLine, RiText } from '@remixicon/react';
import { VariablePicker, Variable } from './VariablePicker';
import styles from './ExpressionBuilder.module.css';

type ExpressionMode = 'static' | 'variable' | 'expression';

export interface ExpressionBuilderProps {
  value?: any;
  onChange: (value: any) => void;
  availableVariables: Variable[];
  propertyType?: string | string[];
}

export function ExpressionBuilder(props: ExpressionBuilderProps) {
  const { value, onChange, availableVariables, propertyType } = props;

  // Determine mode from value
  const getInitialMode = (): ExpressionMode => {
    if (typeof value === 'string') {
      if (value.startsWith('${{') && value.endsWith('}}')) {
        const inner = value.slice(3, -2).trim();
        // Check if it's a simple variable reference
        if (/^[a-zA-Z0-9._]+$/.test(inner)) {
          return 'variable';
        }
        return 'expression';
      }
    }
    return 'static';
  };

  const [mode, setMode] = useState<ExpressionMode>(getInitialMode());

  const handleModeChange = (newMode: ExpressionMode) => {
    setMode(newMode);

    // Clear value when changing modes
    if (newMode === 'static') {
      onChange('');
    } else if (newMode === 'variable') {
      onChange('');
    } else if (newMode === 'expression') {
      onChange('${{  }}');
    }
  };

  const handleStaticChange = (newValue: string) => {
    if (propertyType === 'boolean') {
      onChange(newValue.toLowerCase() === 'true');
    } else {
      onChange(newValue);
    }
  };

  const handleVariableSelect = (variableValue: string) => {
    onChange(variableValue);
  };

  const renderInput = () => {
    switch (mode) {
      case 'static':
        if (propertyType === 'number' || propertyType === 'integer') {
          return (
            <NumberField
              value={typeof value === 'number' ? value : undefined}
              onChange={n => onChange(n)}
              placeholder="Enter a static value..."
            />
          );
        }
        return (
          <TextField
            value={typeof value === 'string' ? value : ''}
            onChange={handleStaticChange}
            placeholder="Enter a static value..."
          />
        );

      case 'variable':
        return (
          <>
            <VariablePicker
              variables={availableVariables}
              value={value}
              onChange={handleVariableSelect}
              placeholder="Select a variable..."
            />
            {value && (
              <Box className={styles.expressionPreview}>
                <Text variant="body-small" color="secondary">
                  Expression:
                </Text>
                <Text variant="body-medium">{value}</Text>
              </Box>
            )}
          </>
        );

      case 'expression':
        return (
          <>
            <TextAreaField
              value={value || '${{  }}'}
              onChange={onChange}
              placeholder="${{ expression }}"
              rows={2}
              description="Use ${{ }} syntax for expressions"
            />
            <Box mt="2">
              <Text variant="body-small" color="secondary">
                Quick insert:
              </Text>
              <Box mt="1">
                <TagGroup
                  items={availableVariables
                    .slice(0, 5)
                    .map(v => ({ id: v.value, label: v.label }))}
                >
                  {item => (
                    <Tag id={item.id} onPress={() => onChange(String(item.id))}>
                      {item.label}
                    </Tag>
                  )}
                </TagGroup>
              </Box>
            </Box>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Flex direction="column" gap="2">
      <ToggleButtonGroup
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[mode]}
        onSelectionChange={keys => {
          const [newMode] = Array.from(keys) as ExpressionMode[];
          if (newMode) {
            handleModeChange(newMode);
          }
        }}
      >
        <ToggleButton id="static" iconStart={<RiText />}>
          Static
        </ToggleButton>
        <ToggleButton id="variable" iconStart={<RiFunctionLine />}>
          Variable
        </ToggleButton>
        <ToggleButton id="expression" iconStart={<RiCodeLine />}>
          Expression
        </ToggleButton>
      </ToggleButtonGroup>

      {renderInput()}
    </Flex>
  );
}
