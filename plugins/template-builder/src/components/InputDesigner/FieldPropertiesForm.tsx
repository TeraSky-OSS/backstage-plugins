import { useState } from 'react';
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Box,
  Button,
  ButtonIcon,
  Checkbox,
  Flex,
  NumberField,
  Select,
  Tag,
  TagGroup,
  Text,
  TextAreaField,
  TextField,
} from '@backstage/ui';
import { RiAddLine, RiDeleteBinLine, RiEditLine } from '@remixicon/react';
import type { FieldDefinition } from '../../types';
import { FieldTypeSelector } from './FieldTypeSelector';
import styles from './FieldPropertiesForm.module.css';

const COMMON_WIDGETS = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'password', label: 'Password' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'color', label: 'Color Picker' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'time', label: 'Time' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'range', label: 'Range Slider' },
  { value: 'updown', label: 'Up/Down Spinner' },
  { value: 'hidden', label: 'Hidden' },
];

const WIDGET_OPTIONS = [
  { id: '', label: 'Default' },
  ...COMMON_WIDGETS.map(widget => ({ id: widget.value, label: widget.label })),
];

const NESTED_TYPE_OPTIONS = [
  { id: 'string', label: 'String' },
  { id: 'number', label: 'Number' },
  { id: 'integer', label: 'Integer' },
  { id: 'boolean', label: 'Boolean' },
  { id: 'array', label: 'Array' },
  { id: 'object', label: 'Object' },
];

const ITEM_TYPE_OPTIONS = [
  { id: 'string', label: 'String' },
  { id: 'number', label: 'Number' },
  { id: 'integer', label: 'Integer' },
  { id: 'boolean', label: 'Boolean' },
  { id: 'object', label: 'Object' },
];

export interface FieldPropertiesFormProps {
  field: FieldDefinition;
  fieldName: string;
  fieldExtensions: string[];
  onUpdate: (updates: Partial<FieldDefinition>) => void;
}

export function FieldPropertiesForm(props: FieldPropertiesFormProps) {
  const { field, fieldName, fieldExtensions, onUpdate } = props;
  const [enumInput, setEnumInput] = useState('');
  const [editingNestedField, setEditingNestedField] = useState<string | null>(null);
  const [nestedFieldDialog, setNestedFieldDialog] = useState(false);

  const handleTypeChange = (type: string, isCustom: boolean) => {
    if (isCustom) {
      onUpdate({ type: 'string', uiField: type });
    } else {
      onUpdate({ type, uiField: undefined });
    }
  };

  const handleUiOptionsChange = (key: string, value: any) => {
    const currentOptions = field.uiOptions || {};
    onUpdate({
      uiOptions: {
        ...currentOptions,
        [key]: value,
      },
    });
  };

  const handleAddEnumValue = () => {
    if (enumInput.trim()) {
      const currentEnum = field.enum || [];
      onUpdate({ enum: [...currentEnum, enumInput.trim()] });
      setEnumInput('');
    }
  };

  const handleRemoveEnumValue = (index: number) => {
    const currentEnum = field.enum || [];
    onUpdate({ enum: currentEnum.filter((_, i) => i !== index) });
  };

  const handleAddNestedProperty = () => {
    const newKey = `property_${Object.keys(field.properties || {}).length + 1}`;
    const currentProperties = field.properties || {};
    onUpdate({
      properties: {
        ...currentProperties,
        [newKey]: {
          title: 'New Property',
          type: 'string',
        },
      },
    });
  };

  const handleUpdateNestedProperty = (key: string, updates: Partial<FieldDefinition>) => {
    const currentProperties = field.properties || {};
    onUpdate({
      properties: {
        ...currentProperties,
        [key]: { ...currentProperties[key], ...updates },
      },
    });
  };

  const handleDeleteNestedProperty = (key: string) => {
    const currentProperties = field.properties || {};
    const { [key]: _, ...rest } = currentProperties;
    onUpdate({ properties: rest });
  };

  const handleUpdateArrayItems = (updates: Partial<FieldDefinition>) => {
    const currentItems = field.items || { title: '', type: 'string' };
    onUpdate({
      items: { ...currentItems, ...updates } as FieldDefinition,
    });
  };

  const enumTagItems = (field.enum || []).map((value, index) => ({
    id: String(index),
    value: String(value),
  }));

  return (
    <Box style={{ paddingTop: 'var(--bui-space-2)' }}>
      <Text as="div" variant="body-small" color="secondary">
        Field Key: {fieldName}
      </Text>

      <Box mt="2" mb="2">
        <Text as="div" variant="title-x-small" weight="bold" style={{ marginBottom: 'var(--bui-space-1)' }}>
          Basic Information
        </Text>
        <TextField
          label="Field Title"
          value={field.title}
          onChange={value => onUpdate({ title: value })}
          size="small"
        />
        <Box mt="1">
          <TextAreaField
            label="Description"
            value={field.description || ''}
            onChange={value => onUpdate({ description: value })}
            rows={2}
          />
        </Box>
        <Box mt="1">
          <FieldTypeSelector
            value={field.type}
            customFieldType={field.uiField}
            availableExtensions={fieldExtensions}
            onChange={handleTypeChange}
          />
        </Box>
      </Box>

      <hr className={styles.divider} />

      {/* Enum/Options for Select/Radio */}
      {(field.type === 'string' || field.type === 'number') && (
        <>
          <Box mt="2" mb="2">
            <Text as="div" variant="title-x-small" weight="bold" style={{ marginBottom: 'var(--bui-space-1)' }}>
              Enum Options
            </Text>
            <Text as="div" variant="body-small" color="secondary">
              Define allowed values for select/radio widgets
            </Text>

            <Flex mt="1" gap="2">
              <Box style={{ flex: 1 }}>
                <TextField
                  label="Add Option"
                  value={enumInput}
                  onChange={setEnumInput}
                  size="small"
                  placeholder="Enter value and press Enter"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEnumValue();
                    }
                  }}
                />
              </Box>
            </Flex>

            {enumTagItems.length > 0 && (
              <Box mt="1">
                <TagGroup
                  items={enumTagItems}
                  onRemove={keys => {
                    const [key] = keys;
                    if (typeof key === 'string') {
                      handleRemoveEnumValue(Number(key));
                    }
                  }}
                >
                  {item => (
                    <Tag id={item.id} textValue={item.value}>
                      {item.value}
                    </Tag>
                  )}
                </TagGroup>
              </Box>
            )}
          </Box>
          <hr className={styles.divider} />
        </>
      )}

      <Box mt="2" mb="2">
        <Text as="div" variant="title-x-small" weight="bold" style={{ marginBottom: 'var(--bui-space-1)' }}>
          Validation
        </Text>

        {(field.type === 'string' && !field.uiField) && (
          <Flex direction="column" gap="1">
            <TextField
              label="Pattern (regex)"
              value={field.pattern || ''}
              onChange={value => onUpdate({ pattern: value })}
              size="small"
              placeholder="^[a-z]+$"
            />
            <NumberField
              label="Min Length"
              value={field.minLength}
              onChange={value => onUpdate({ minLength: Number.isNaN(value) ? undefined : value })}
              size="small"
            />
            <NumberField
              label="Max Length"
              value={field.maxLength}
              onChange={value => onUpdate({ maxLength: Number.isNaN(value) ? undefined : value })}
              size="small"
            />
          </Flex>
        )}

        {(field.type === 'number' || field.type === 'integer') && (
          <Flex direction="column" gap="1">
            <NumberField
              label="Minimum"
              value={field.minimum}
              onChange={value => onUpdate({ minimum: Number.isNaN(value) ? undefined : value })}
              size="small"
            />
            <NumberField
              label="Maximum"
              value={field.maximum}
              onChange={value => onUpdate({ maximum: Number.isNaN(value) ? undefined : value })}
              size="small"
            />
          </Flex>
        )}
      </Box>

      <hr className={styles.divider} />

      <Box mt="2" mb="2">
        <Text as="div" variant="title-x-small" weight="bold" style={{ marginBottom: 'var(--bui-space-1)' }}>
          Default Value
        </Text>
        {field.type === 'boolean' ? (
          <Checkbox
            isSelected={field.default === true}
            onChange={isSelected => onUpdate({ default: isSelected })}
          >
            Default value
          </Checkbox>
        ) : (
          <TextField
            label="Default Value"
            value={field.default ?? ''}
            onChange={value => onUpdate({ default: value })}
            size="small"
          />
        )}
      </Box>

      <hr className={styles.divider} />

      <Box mt="2">
        <Accordion>
          <AccordionTrigger>
            <Text variant="title-x-small" weight="bold">UI Options</Text>
          </AccordionTrigger>
          <AccordionPanel>
            <Box width="100%">
              <Select
                label="Widget"
                selectedKey={field.uiWidget || ''}
                onSelectionChange={key => onUpdate({ uiWidget: key as string })}
                options={WIDGET_OPTIONS}
              />

              <Box mt="1">
                <TextField
                  label="Placeholder"
                  value={field.uiPlaceholder || ''}
                  onChange={value => onUpdate({ uiPlaceholder: value })}
                  size="small"
                />
              </Box>

              <Box mt="1">
                <TextAreaField
                  label="Help Text"
                  value={field.uiHelp || ''}
                  onChange={value => onUpdate({ uiHelp: value })}
                  rows={2}
                />
              </Box>

              <Box mt="1">
                <NumberField
                  label="Rows (for textarea)"
                  value={(field.uiOptions as any)?.rows ?? undefined}
                  onChange={value =>
                    handleUiOptionsChange('rows', Number.isNaN(value) ? undefined : value)
                  }
                  size="small"
                />
              </Box>

              <Box mt="1">
                <TextField
                  label="Empty Value"
                  value={(field.uiOptions as any)?.emptyValue || ''}
                  onChange={value => handleUiOptionsChange('emptyValue', value)}
                  size="small"
                  description="Value to use when field is empty"
                />
              </Box>

              <Box mt="2">
                <Checkbox
                  isSelected={field.uiAutofocus || false}
                  onChange={isSelected => onUpdate({ uiAutofocus: isSelected })}
                >
                  Auto-focus
                </Checkbox>
              </Box>

              <Checkbox
                isSelected={field.uiDisabled || false}
                onChange={isSelected => onUpdate({ uiDisabled: isSelected })}
              >
                Disabled
              </Checkbox>

              <Checkbox
                isSelected={field.uiReadonly || false}
                onChange={isSelected => onUpdate({ uiReadonly: isSelected })}
              >
                Read-only
              </Checkbox>
            </Box>
          </AccordionPanel>
        </Accordion>
      </Box>

      {/* Custom Field Options */}
      {field.uiField && (
        <Box mt="2">
          <Accordion>
            <AccordionTrigger>
              <Text variant="title-x-small" weight="bold">
                {field.uiField} Options (JSON)
              </Text>
            </AccordionTrigger>
            <AccordionPanel>
              <Box width="100%">
                <Text as="div" variant="body-small" color="secondary">
                  Configure options specific to the {field.uiField} field extension.
                  Common options:
                </Text>
                <Text as="div" variant="body-small" color="secondary">
                  • <strong>allowedHosts:</strong> Array of allowed hosts (for RepoUrlPicker)
                  <br />
                  • <strong>allowedOwners:</strong> Array of allowed owners
                  <br />
                  • <strong>catalogFilter:</strong> Filter for catalog entities
                  <br />
                  • <strong>requestUserCredentials:</strong> Request user credentials
                </Text>

                <Box mt="1">
                  <TextAreaField
                    value={field.uiOptions ? JSON.stringify(field.uiOptions, null, 2) : '{}'}
                    onChange={value => {
                      try {
                        const parsed = JSON.parse(value);
                        onUpdate({ uiOptions: parsed });
                      } catch {
                        // Invalid JSON, don't update
                      }
                    }}
                    rows={8}
                    placeholder={`{
  "allowedHosts": ["github.com"],
  "requestUserCredentials": true
}`}
                    description="Enter valid JSON for custom field options"
                  />
                </Box>
              </Box>
            </AccordionPanel>
          </Accordion>
        </Box>
      )}

      {/* Nested Object Properties */}
      {field.type === 'object' && (
        <Box mt="2">
          <Accordion defaultExpanded>
            <AccordionTrigger>
              <Text variant="title-x-small" weight="bold">Object Properties</Text>
            </AccordionTrigger>
            <AccordionPanel>
              <Box width="100%">
                <Text as="div" variant="body-small" color="secondary">
                  Define nested properties for this object
                </Text>

                <Box mt="1" mb="1">
                  <Button
                    size="small"
                    iconStart={<RiAddLine />}
                    onPress={handleAddNestedProperty}
                    variant="secondary"
                    style={{ width: '100%' }}
                  >
                    Add Property
                  </Button>
                </Box>

                {field.properties && Object.keys(field.properties).length > 0 ? (
                  <Box>
                    {Object.entries(field.properties).map(([key, prop]) => (
                      <Box key={key} className={styles.nestedPropertyRow}>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text as="div" variant="body-small">{`${key}: ${prop.title || key}`}</Text>
                          <Text as="div" variant="body-small" color="secondary">
                            {`Type: ${prop.type}${prop.description ? ` - ${prop.description}` : ''}`}
                          </Text>
                        </Box>
                        <Flex gap="1">
                          <ButtonIcon
                            aria-label={`Edit property ${key}`}
                            icon={<RiEditLine />}
                            size="small"
                            variant="tertiary"
                            onPress={() => {
                              setEditingNestedField(key);
                              setNestedFieldDialog(true);
                            }}
                          />
                          <ButtonIcon
                            aria-label={`Delete property ${key}`}
                            icon={<RiDeleteBinLine />}
                            size="small"
                            variant="tertiary"
                            onPress={() => handleDeleteNestedProperty(key)}
                          />
                        </Flex>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Text as="div" variant="body-small" color="secondary" style={{ marginTop: 'var(--bui-space-1)' }}>
                    No properties defined. Click "Add Property" to add nested fields.
                  </Text>
                )}

                {/* Nested Field Editor - Simplified inline editor */}
                {editingNestedField && field.properties?.[editingNestedField] && nestedFieldDialog && (
                  <Box className={styles.nestedFieldEditor}>
                    <Text as="div" variant="title-x-small" weight="bold" style={{ marginBottom: 'var(--bui-space-1)' }}>
                      Edit Property: {editingNestedField}
                    </Text>

                    <TextField
                      label="Property Key"
                      value={editingNestedField}
                      size="small"
                      isDisabled
                      description="Property key cannot be changed after creation"
                    />

                    <Box mt="1">
                      <TextField
                        label="Title"
                        value={field.properties[editingNestedField].title}
                        onChange={value => handleUpdateNestedProperty(editingNestedField, { title: value })}
                        size="small"
                      />
                    </Box>

                    <Box mt="1">
                      <TextAreaField
                        label="Description"
                        value={field.properties[editingNestedField].description || ''}
                        onChange={value => handleUpdateNestedProperty(editingNestedField, { description: value })}
                        rows={2}
                      />
                    </Box>

                    <Box mt="1">
                      <Select
                        label="Type"
                        selectedKey={field.properties[editingNestedField].type}
                        onSelectionChange={key => handleUpdateNestedProperty(editingNestedField, { type: key as string })}
                        options={NESTED_TYPE_OPTIONS}
                      />
                    </Box>

                    {field.properties[editingNestedField].type === 'string' && (
                      <>
                        <Box mt="1">
                          <TextField
                            label="Default Value"
                            value={field.properties[editingNestedField].default || ''}
                            onChange={value => handleUpdateNestedProperty(editingNestedField, { default: value })}
                            size="small"
                          />
                        </Box>
                        <Box mt="1">
                          <TextField
                            label="Enum Values (comma-separated)"
                            value={field.properties[editingNestedField].enum?.join(', ') || ''}
                            onChange={value => {
                              const values = value.split(',').map(v => v.trim()).filter(Boolean);
                              handleUpdateNestedProperty(editingNestedField, { enum: values.length > 0 ? values : undefined });
                            }}
                            size="small"
                            description="For dropdowns/select fields"
                          />
                        </Box>
                      </>
                    )}

                    <Box mt="2">
                      <Button
                        size="small"
                        variant="primary"
                        onPress={() => {
                          setEditingNestedField(null);
                          setNestedFieldDialog(false);
                        }}
                      >
                        Done
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </AccordionPanel>
          </Accordion>
        </Box>
      )}

      {/* Array Items Configuration */}
      {field.type === 'array' && (
        <Box mt="2">
          <Accordion defaultExpanded>
            <AccordionTrigger>
              <Text variant="title-x-small" weight="bold">Array Item Configuration</Text>
            </AccordionTrigger>
            <AccordionPanel>
              <Box width="100%">
                <Text as="div" variant="body-small" color="secondary">
                  Configure the schema for items in this array
                </Text>

                <Box mt="1">
                  <Select
                    label="Item Type"
                    selectedKey={field.items?.type || 'string'}
                    onSelectionChange={key => handleUpdateArrayItems({ type: key as string })}
                    options={ITEM_TYPE_OPTIONS}
                  />
                </Box>

                {field.items?.type === 'string' && (
                  <Box mt="1">
                    <TextField
                      label="Allowed Values (comma-separated)"
                      value={field.items.enum?.join(', ') || ''}
                      onChange={value => {
                        const values = value.split(',').map(v => v.trim()).filter(Boolean);
                        handleUpdateArrayItems({ enum: values.length > 0 ? values : undefined });
                      }}
                      size="small"
                      description="Define allowed values for array items"
                    />
                  </Box>
                )}

                <Box mt="1">
                  <NumberField
                    label="Minimum Items"
                    value={field.minLength}
                    onChange={value => onUpdate({ minLength: Number.isNaN(value) ? undefined : value })}
                    size="small"
                  />
                </Box>

                <Box mt="1">
                  <NumberField
                    label="Maximum Items"
                    value={field.maxLength}
                    onChange={value => onUpdate({ maxLength: Number.isNaN(value) ? undefined : value })}
                    size="small"
                  />
                </Box>

                <Box mt="2">
                  <Checkbox
                    isSelected={(field.uiOptions as any)?.uniqueItems || false}
                    onChange={isSelected => handleUiOptionsChange('uniqueItems', isSelected)}
                  >
                    Unique Items
                  </Checkbox>
                </Box>
              </Box>
            </AccordionPanel>
          </Accordion>
        </Box>
      )}
    </Box>
  );
}
