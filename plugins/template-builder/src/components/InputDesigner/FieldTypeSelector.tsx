import { useState, useMemo } from 'react';
import { Box, Button, Flex, Select, Text, TextField } from '@backstage/ui';

export interface FieldTypeOption {
  value: string;
  label: string;
  description?: string;
  isCustom: boolean;
}

const BUILT_IN_TYPES: FieldTypeOption[] = [
  { value: 'string', label: 'String', description: 'Text input', isCustom: false },
  { value: 'number', label: 'Number', description: 'Numeric input', isCustom: false },
  { value: 'integer', label: 'Integer', description: 'Integer input', isCustom: false },
  { value: 'boolean', label: 'Boolean', description: 'Checkbox', isCustom: false },
  { value: 'array', label: 'Array', description: 'List of items', isCustom: false },
  { value: 'object', label: 'Object', description: 'Nested object', isCustom: false },
];

const CUSTOM_OPTION_ID = '__custom__';

export interface FieldTypeSelectorProps {
  value: string;
  customFieldType?: string;
  availableExtensions: string[];
  onChange: (type: string, isCustom: boolean) => void;
  fullWidth?: boolean;
}

export function FieldTypeSelector(props: FieldTypeSelectorProps) {
  const { value, customFieldType, availableExtensions, onChange } = props;
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customFieldName, setCustomFieldName] = useState('');

  const displayValue = customFieldType || value;
  const isCustom = !!customFieldType;

  // Build dynamic list of custom field extensions
  const customFieldTypes = useMemo(() => {
    return availableExtensions.map(ext => ({
      value: ext,
      label: ext,
      description: `Custom field extension`,
      isCustom: true,
    }));
  }, [availableExtensions]);

  const handleChange = (newValue: string) => {
    if (newValue === CUSTOM_OPTION_ID) {
      setShowCustomInput(true);
      return;
    }

    const customType = customFieldTypes.find(t => t.value === newValue);
    if (customType) {
      onChange(newValue, true);
    } else {
      onChange(newValue, false);
    }
  };

  const handleCustomFieldSubmit = () => {
    if (customFieldName.trim()) {
      onChange(customFieldName.trim(), true);
      setCustomFieldName('');
      setShowCustomInput(false);
    }
  };

  if (showCustomInput) {
    return (
      <Box>
        <TextField
          label="Custom Field Type Name"
          value={customFieldName}
          onChange={setCustomFieldName}
          size="small"
          placeholder="e.g., MyCustomFieldExtension"
          description="Enter the exact name of your registered custom field extension"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleCustomFieldSubmit();
            }
          }}
        />
        <Flex mt="1" gap="2">
          <Button variant="primary" size="small" onPress={handleCustomFieldSubmit}>
            Add
          </Button>
          <Button
            variant="secondary"
            size="small"
            onPress={() => {
              setShowCustomInput(false);
              setCustomFieldName('');
            }}
          >
            Cancel
          </Button>
        </Flex>
      </Box>
    );
  }

  const options = [
    {
      title: 'Basic Types',
      options: BUILT_IN_TYPES.map(type => ({ id: type.value, label: type.label })),
    },
    ...(customFieldTypes.length > 0
      ? [
          {
            title: `Available Field Extensions (${customFieldTypes.length})`,
            options: customFieldTypes.map(type => ({ id: type.value, label: type.label })),
          },
        ]
      : []),
    {
      title: 'Other',
      options: [{ id: CUSTOM_OPTION_ID, label: 'Add Custom Field Type...' }],
    },
  ];

  return (
    <Box>
      <Select
        label="Field Type"
        selectedKey={displayValue}
        onSelectionChange={key => handleChange(key as string)}
        options={options}
      />
      {isCustom && (
        <Text variant="body-small" color="secondary">
          Using custom field extension: {customFieldType}
        </Text>
      )}
    </Box>
  );
}
