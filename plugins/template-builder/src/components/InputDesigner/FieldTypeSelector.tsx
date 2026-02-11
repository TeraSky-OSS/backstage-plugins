import { useState, useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  TextField,
  Box,
  Button,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';

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

export interface FieldTypeSelectorProps {
  value: string;
  customFieldType?: string;
  availableExtensions: string[];
  onChange: (type: string, isCustom: boolean) => void;
  fullWidth?: boolean;
}

export function FieldTypeSelector(props: FieldTypeSelectorProps) {
  const { value, customFieldType, availableExtensions, onChange, fullWidth = true } = props;
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
    if (newValue === '__custom__') {
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
          fullWidth
          label="Custom Field Type Name"
          value={customFieldName}
          onChange={e => setCustomFieldName(e.target.value)}
          variant="outlined"
          size="small"
          placeholder="e.g., MyCustomFieldExtension"
          helperText="Enter the exact name of your registered custom field extension"
          onKeyPress={e => {
            if (e.key === 'Enter') {
              handleCustomFieldSubmit();
            }
          }}
        />
        <Box mt={1} display="flex" style={{ gap: 8 }}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleCustomFieldSubmit}
          >
            Add
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setShowCustomInput(false);
              setCustomFieldName('');
            }}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    );
  }

  // Build menu items as a flat array to avoid Fragment issues
  const menuItems = [
    <MenuItem key="header-basic" disabled>
      <em>Basic Types</em>
    </MenuItem>,
    ...BUILT_IN_TYPES.map(type => (
      <MenuItem key={type.value} value={type.value}>
        {type.label}
      </MenuItem>
    )),
  ];

  if (customFieldTypes.length > 0) {
    menuItems.push(
      <MenuItem key="header-extensions" disabled style={{ marginTop: 8 }}>
        <em>Available Field Extensions ({customFieldTypes.length})</em>
      </MenuItem>
    );
    menuItems.push(
      ...customFieldTypes.map(type => (
        <MenuItem key={type.value} value={type.value}>
          {type.label}
        </MenuItem>
      ))
    );
  }

  menuItems.push(
    <MenuItem key="custom-add" value="__custom__" style={{ marginTop: 8, fontStyle: 'italic' }}>
      <AddIcon fontSize="small" style={{ marginRight: 8 }} />
      Add Custom Field Type...
    </MenuItem>
  );

  return (
    <FormControl fullWidth={fullWidth} variant="outlined" size="small">
      <InputLabel>Field Type</InputLabel>
      <Select
        value={displayValue}
        onChange={e => handleChange(e.target.value as string)}
        label="Field Type"
      >
        {menuItems}
      </Select>
      {isCustom && (
        <FormHelperText>
          Using custom field extension: {customFieldType}
        </FormHelperText>
      )}
    </FormControl>
  );
}
