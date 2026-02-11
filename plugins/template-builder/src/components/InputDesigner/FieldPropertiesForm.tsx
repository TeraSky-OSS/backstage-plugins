import { useState } from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import type { FieldDefinition } from '../../types';
import { FieldTypeSelector } from './FieldTypeSelector';

const useStyles = makeStyles(theme => ({
  root: {
    paddingTop: theme.spacing(1),
  },
  section: {
    marginBottom: theme.spacing(2),
  },
  sectionTitle: {
    marginBottom: theme.spacing(1),
    fontWeight: 600,
  },
  chipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(1),
  },
}));

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

export interface FieldPropertiesFormProps {
  field: FieldDefinition;
  fieldName: string;
  fieldExtensions: string[];
  onUpdate: (updates: Partial<FieldDefinition>) => void;
}

export function FieldPropertiesForm(props: FieldPropertiesFormProps) {
  const { field, fieldName, fieldExtensions, onUpdate } = props;
  const classes = useStyles();
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

  return (
    <Box className={classes.root}>
      <Typography variant="caption" color="textSecondary" gutterBottom display="block">
        Field Key: {fieldName}
      </Typography>

      <Box mt={2} className={classes.section}>
        <Typography variant="subtitle2" className={classes.sectionTitle}>
          Basic Information
        </Typography>
        <TextField
          fullWidth
          label="Field Title"
          value={field.title}
          onChange={e => onUpdate({ title: e.target.value })}
          variant="outlined"
          size="small"
          margin="dense"
        />
        <TextField
          fullWidth
          label="Description"
          value={field.description || ''}
          onChange={e => onUpdate({ description: e.target.value })}
          variant="outlined"
          size="small"
          margin="dense"
          multiline
          rows={2}
        />
        <Box mt={1}>
          <FieldTypeSelector
            value={field.type}
            customFieldType={field.uiField}
            availableExtensions={fieldExtensions}
            onChange={handleTypeChange}
          />
        </Box>
      </Box>

      <Divider />

      {/* Enum/Options for Select/Radio */}
      {(field.type === 'string' || field.type === 'number') && (
        <>
          <Box mt={2} className={classes.section}>
            <Typography variant="subtitle2" className={classes.sectionTitle}>
              Enum Options
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
              Define allowed values for select/radio widgets
            </Typography>
            
            <Box display="flex" style={{ gap: 8 }} mt={1}>
              <TextField
                fullWidth
                label="Add Option"
                value={enumInput}
                onChange={e => setEnumInput(e.target.value)}
                variant="outlined"
                size="small"
                placeholder="Enter value and press Enter"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddEnumValue();
                  }
                }}
              />
            </Box>
            
            {field.enum && field.enum.length > 0 && (
              <Box className={classes.chipContainer}>
                {field.enum.map((value, index) => (
                  <Chip
                    key={index}
                    label={value}
                    onDelete={() => handleRemoveEnumValue(index)}
                    size="small"
                  />
                ))}
              </Box>
            )}
          </Box>
          <Divider />
        </>
      )}

      <Box mt={2} className={classes.section}>
        <Typography variant="subtitle2" className={classes.sectionTitle}>
          Validation
        </Typography>
        
        {(field.type === 'string' && !field.uiField) && (
          <>
            <TextField
              fullWidth
              label="Pattern (regex)"
              value={field.pattern || ''}
              onChange={e => onUpdate({ pattern: e.target.value })}
              variant="outlined"
              size="small"
              margin="dense"
              placeholder="^[a-z]+$"
            />
            <TextField
              fullWidth
              label="Min Length"
              type="number"
              value={field.minLength ?? ''}
              onChange={e => onUpdate({ minLength: e.target.value ? parseInt(e.target.value) : undefined })}
              variant="outlined"
              size="small"
              margin="dense"
            />
            <TextField
              fullWidth
              label="Max Length"
              type="number"
              value={field.maxLength ?? ''}
              onChange={e => onUpdate({ maxLength: e.target.value ? parseInt(e.target.value) : undefined })}
              variant="outlined"
              size="small"
              margin="dense"
            />
          </>
        )}

        {(field.type === 'number' || field.type === 'integer') && (
          <>
            <TextField
              fullWidth
              label="Minimum"
              type="number"
              value={field.minimum ?? ''}
              onChange={e => onUpdate({ minimum: e.target.value ? parseFloat(e.target.value) : undefined })}
              variant="outlined"
              size="small"
              margin="dense"
            />
            <TextField
              fullWidth
              label="Maximum"
              type="number"
              value={field.maximum ?? ''}
              onChange={e => onUpdate({ maximum: e.target.value ? parseFloat(e.target.value) : undefined })}
              variant="outlined"
              size="small"
              margin="dense"
            />
          </>
        )}
      </Box>

      <Divider />

      <Box mt={2} className={classes.section}>
        <Typography variant="subtitle2" className={classes.sectionTitle}>
          Default Value
        </Typography>
        {field.type === 'boolean' ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={field.default === true}
                onChange={e => onUpdate({ default: e.target.checked })}
              />
            }
            label="Default value"
          />
        ) : (
          <TextField
            fullWidth
            label="Default Value"
            value={field.default ?? ''}
            onChange={e => onUpdate({ default: e.target.value })}
            variant="outlined"
            size="small"
            margin="dense"
          />
        )}
      </Box>

      <Divider />

      <Box mt={2}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">UI Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box width="100%">
              {/* Widget Selector */}
              <FormControl fullWidth variant="outlined" size="small" margin="dense">
                <InputLabel>Widget</InputLabel>
                <Select
                  value={field.uiWidget || ''}
                  onChange={e => onUpdate({ uiWidget: e.target.value as string })}
                  label="Widget"
                >
                  <MenuItem value="">
                    <em>Default</em>
                  </MenuItem>
                  {COMMON_WIDGETS.map(widget => (
                    <MenuItem key={widget.value} value={widget.value}>
                      {widget.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Placeholder"
                value={field.uiPlaceholder || ''}
                onChange={e => onUpdate({ uiPlaceholder: e.target.value })}
                variant="outlined"
                size="small"
                margin="dense"
              />
              
              <TextField
                fullWidth
                label="Help Text"
                value={field.uiHelp || ''}
                onChange={e => onUpdate({ uiHelp: e.target.value })}
                variant="outlined"
                size="small"
                margin="dense"
                multiline
                rows={2}
              />

              <TextField
                fullWidth
                label="Rows (for textarea)"
                type="number"
                value={(field.uiOptions as any)?.rows || ''}
                onChange={e => handleUiOptionsChange('rows', e.target.value ? parseInt(e.target.value) : undefined)}
                variant="outlined"
                size="small"
                margin="dense"
              />

              <TextField
                fullWidth
                label="Empty Value"
                value={(field.uiOptions as any)?.emptyValue || ''}
                onChange={e => handleUiOptionsChange('emptyValue', e.target.value)}
                variant="outlined"
                size="small"
                margin="dense"
                helperText="Value to use when field is empty"
              />

              <Box mt={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.uiAutofocus || false}
                      onChange={e => onUpdate({ uiAutofocus: e.target.checked })}
                    />
                  }
                  label="Auto-focus"
                />
              </Box>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.uiDisabled || false}
                    onChange={e => onUpdate({ uiDisabled: e.target.checked })}
                  />
                }
                label="Disabled"
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.uiReadonly || false}
                    onChange={e => onUpdate({ uiReadonly: e.target.checked })}
                  />
                }
                label="Read-only"
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Custom Field Options */}
      {field.uiField && (
        <Box mt={2}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                {field.uiField} Options (JSON)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box width="100%">
                <Typography variant="caption" color="textSecondary" gutterBottom display="block">
                  Configure options specific to the {field.uiField} field extension.
                  Common options:
                </Typography>
                <Typography variant="caption" color="textSecondary" component="div">
                  • <strong>allowedHosts:</strong> Array of allowed hosts (for RepoUrlPicker)
                  <br />
                  • <strong>allowedOwners:</strong> Array of allowed owners
                  <br />
                  • <strong>catalogFilter:</strong> Filter for catalog entities
                  <br />
                  • <strong>requestUserCredentials:</strong> Request user credentials
                </Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={field.uiOptions ? JSON.stringify(field.uiOptions, null, 2) : '{}'}
                  onChange={e => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      onUpdate({ uiOptions: parsed });
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  variant="outlined"
                  placeholder={`{
  "allowedHosts": ["github.com"],
  "requestUserCredentials": true
}`}
                  helperText="Enter valid JSON for custom field options"
                  style={{ marginTop: 8 }}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      {/* Nested Object Properties */}
      {field.type === 'object' && (
        <Box mt={2}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Object Properties</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box width="100%">
                <Typography variant="caption" color="textSecondary" gutterBottom display="block">
                  Define nested properties for this object
                </Typography>
                
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddNestedProperty}
                  variant="outlined"
                  color="primary"
                  fullWidth
                  style={{ marginTop: 8, marginBottom: 8 }}
                >
                  Add Property
                </Button>

                {field.properties && Object.keys(field.properties).length > 0 ? (
                  <List dense>
                    {Object.entries(field.properties).map(([key, prop]) => (
                      <ListItem key={key} divider>
                        <ListItemText
                          primary={`${key}: ${prop.title || key}`}
                          secondary={`Type: ${prop.type}${prop.description ? ` - ${prop.description}` : ''}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => {
                              setEditingNestedField(key);
                              setNestedFieldDialog(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleDeleteNestedProperty(key)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
                    No properties defined. Click "Add Property" to add nested fields.
                  </Typography>
                )}

                {/* Nested Field Editor - Simplified inline editor */}
                {editingNestedField && field.properties?.[editingNestedField] && nestedFieldDialog && (
                  <Box mt={2} p={2} border={1} borderColor="divider" borderRadius={4}>
                    <Typography variant="subtitle2" gutterBottom>
                      Edit Property: {editingNestedField}
                    </Typography>
                    
                    <TextField
                      fullWidth
                      label="Property Key"
                      value={editingNestedField}
                      variant="outlined"
                      size="small"
                      margin="dense"
                      disabled
                      helperText="Property key cannot be changed after creation"
                    />
                    
                    <TextField
                      fullWidth
                      label="Title"
                      value={field.properties[editingNestedField].title}
                      onChange={e => handleUpdateNestedProperty(editingNestedField, { title: e.target.value })}
                      variant="outlined"
                      size="small"
                      margin="dense"
                    />
                    
                    <TextField
                      fullWidth
                      label="Description"
                      value={field.properties[editingNestedField].description || ''}
                      onChange={e => handleUpdateNestedProperty(editingNestedField, { description: e.target.value })}
                      variant="outlined"
                      size="small"
                      margin="dense"
                      multiline
                      rows={2}
                    />

                    <FormControl fullWidth variant="outlined" size="small" margin="dense">
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={field.properties[editingNestedField].type}
                        onChange={e => handleUpdateNestedProperty(editingNestedField, { type: e.target.value as string })}
                        label="Type"
                      >
                        <MenuItem value="string">String</MenuItem>
                        <MenuItem value="number">Number</MenuItem>
                        <MenuItem value="integer">Integer</MenuItem>
                        <MenuItem value="boolean">Boolean</MenuItem>
                        <MenuItem value="array">Array</MenuItem>
                        <MenuItem value="object">Object</MenuItem>
                      </Select>
                    </FormControl>

                    {field.properties[editingNestedField].type === 'string' && (
                      <>
                        <TextField
                          fullWidth
                          label="Default Value"
                          value={field.properties[editingNestedField].default || ''}
                          onChange={e => handleUpdateNestedProperty(editingNestedField, { default: e.target.value })}
                          variant="outlined"
                          size="small"
                          margin="dense"
                        />
                        <TextField
                          fullWidth
                          label="Enum Values (comma-separated)"
                          value={field.properties[editingNestedField].enum?.join(', ') || ''}
                          onChange={e => {
                            const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                            handleUpdateNestedProperty(editingNestedField, { enum: values.length > 0 ? values : undefined });
                          }}
                          variant="outlined"
                          size="small"
                          margin="dense"
                          helperText="For dropdowns/select fields"
                        />
                      </>
                    )}

                    <Box mt={2} display="flex" style={{ gap: 8 }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => {
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
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      {/* Array Items Configuration */}
      {field.type === 'array' && (
        <Box mt={2}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Array Item Configuration</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box width="100%">
                <Typography variant="caption" color="textSecondary" gutterBottom display="block">
                  Configure the schema for items in this array
                </Typography>

                <FormControl fullWidth variant="outlined" size="small" margin="dense">
                  <InputLabel>Item Type</InputLabel>
                  <Select
                    value={field.items?.type || 'string'}
                    onChange={e => handleUpdateArrayItems({ type: e.target.value as string })}
                    label="Item Type"
                  >
                    <MenuItem value="string">String</MenuItem>
                    <MenuItem value="number">Number</MenuItem>
                    <MenuItem value="integer">Integer</MenuItem>
                    <MenuItem value="boolean">Boolean</MenuItem>
                    <MenuItem value="object">Object</MenuItem>
                  </Select>
                </FormControl>

                {field.items?.type === 'string' && (
                  <TextField
                    fullWidth
                    label="Allowed Values (comma-separated)"
                    value={field.items.enum?.join(', ') || ''}
                    onChange={e => {
                      const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                      handleUpdateArrayItems({ enum: values.length > 0 ? values : undefined });
                    }}
                    variant="outlined"
                    size="small"
                    margin="dense"
                    helperText="Define allowed values for array items"
                  />
                )}

                <TextField
                  fullWidth
                  label="Minimum Items"
                  type="number"
                  value={field.minLength ?? ''}
                  onChange={e => onUpdate({ minLength: e.target.value ? parseInt(e.target.value) : undefined })}
                  variant="outlined"
                  size="small"
                  margin="dense"
                />

                <TextField
                  fullWidth
                  label="Maximum Items"
                  type="number"
                  value={field.maxLength ?? ''}
                  onChange={e => onUpdate({ maxLength: e.target.value ? parseInt(e.target.value) : undefined })}
                  variant="outlined"
                  size="small"
                  margin="dense"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={(field.uiOptions as any)?.uniqueItems || false}
                      onChange={e => handleUiOptionsChange('uniqueItems', e.target.checked)}
                    />
                  }
                  label="Unique Items"
                  style={{ marginTop: 8 }}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </Box>
  );
}
