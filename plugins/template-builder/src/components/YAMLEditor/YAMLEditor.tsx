import { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Box, Paper, Typography, Chip, useTheme } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Alert } from '@material-ui/lab';
import { parseYAML, isValidTemplateYAML } from '../../utils/yamlParser';
import type { AvailableAction } from '../../types';
import { MonacoErrorBoundary } from './MonacoErrorBoundary';
import './YAMLEditor.css';

const useStyles = makeStyles(theme => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 5000,
    backgroundColor: theme.palette.background.paper,
  },
  header: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editorContainer: {
    flex: 1,
    position: 'relative',
    minHeight: 400,
    backgroundColor: theme.palette.background.default,
  },
  statusBar: {
    padding: theme.spacing(1, 2),
    borderTop: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'center',
    backgroundColor: theme.palette.background.default,
  },
  errorList: {
    maxHeight: 200,
    overflow: 'auto',
    padding: theme.spacing(1),
  },
}));

export interface YAMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  readOnly?: boolean;
  availableActions?: AvailableAction[];
  fieldExtensions?: string[];
}

export function YAMLEditor(props: YAMLEditorProps) {
  const { value, onChange, onValidationChange, readOnly = false, availableActions = [], fieldExtensions = [] } = props;
  const classes = useStyles();
  const theme = useTheme();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);


  // Inject CSS to ensure popup is above everything
  useEffect(() => {
    const styleId = 'monaco-popup-fix-v2';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        body .monaco-editor .suggest-widget,
        body .suggest-widget {
          z-index: 999999 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Determine Monaco theme based on MUI theme
  const monacoTheme = theme.palette.type === 'dark' ? 'vs-dark' : 'vs-light';

  const handleEditorDidMount = useCallback(
    (editor: any, monaco: any) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      
      // Install comprehensive error suppression for Monaco hit test errors
      
      // Method 1: Window error handler
      const originalWindowError = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        const errorStr = String(message || error?.message || '');
        const stackStr = String(error?.stack || '');
        
        if (errorStr.includes('offsetNode') || 
            errorStr.includes('doHitTest') ||
            stackStr.includes('_doHitTestWithCaretPositionFromPoint') ||
            (source && source.includes('monaco-editor'))) {
          return true;
        }
        
        if (originalWindowError) {
          return originalWindowError(message, source, lineno, colno, error);
        }
        return false;
      };
      
      // Method 2: Unhandled promise rejection handler
      const originalUnhandledRejection = window.onunhandledrejection;
      window.onunhandledrejection = (event: PromiseRejectionEvent) => {
        const errorStr = String(event.reason?.message || event.reason || '');
        const stackStr = String(event.reason?.stack || '');
        
        if (errorStr.includes('offsetNode') || 
            errorStr.includes('doHitTest') ||
            stackStr.includes('_doHitTestWithCaretPositionFromPoint')) {
          event.preventDefault();
          return;
        }
        
        if (originalUnhandledRejection) {
          originalUnhandledRejection.call(window, event);
        }
      };
      
      // Method 3: Wrap console.error to suppress React error overlay
      const originalConsoleError = console.error;
      console.error = (...args: any[]) => {
        const errorStr = args.join(' ');
        
        if (errorStr.includes('offsetNode') || 
            errorStr.includes('doHitTest') ||
            errorStr.includes('_doHitTestWithCaretPositionFromPoint')) {
          return;
        }
        
        originalConsoleError.apply(console, args);
      };
      
      // Helper: Analyze current context in YAML
      const analyzeContext = (model: any, position: any) => {
        const lines = model.getLinesContent();
        const currentLine = lines[position.lineNumber - 1];
        const currentIndent = currentLine.search(/\S/);
        const cursorIndent = currentIndent === -1 ? 999 : currentIndent;
        
        // Build context stack by scanning FORWARD from start to cursor
        let contextStack: Array<{indent: number, key: string}> = [];
        let actionId: string | null = null;
        
        // Scan from beginning to cursor position
        for (let i = 0; i < position.lineNumber - 1; i++) {
          const line = lines[i];
          const indent = line.search(/\S/);
          if (indent === -1) continue; // Skip empty lines
          
          const trimmed = line.trim();
          if (trimmed.startsWith('#')) continue; // Skip comments
          
          const keyMatch = trimmed.match(/^([a-zA-Z0-9_-]+):/);
          if (!keyMatch) continue;
          
          const key = keyMatch[1];
          
          // Keep only items with LOWER indent (ancestors)
          // Remove items at same or higher indent (siblings and children)
          contextStack = contextStack.filter(item => item.indent < indent);
          
          // Add this key
          contextStack.push({ indent, key });
          
          // Look for action ID
          if (!actionId && trimmed.match(/^action:\s*(.+)$/)) {
            const match = trimmed.match(/^action:\s*(.+)$/);
            if (match) actionId = match[1].trim();
          }
        }
        
        // Extract active contexts from stack
        const activeKeys = contextStack.map(c => c.key);
        const inSteps = activeKeys.includes('steps');
        const inInput = activeKeys.includes('input');
        const inParameters = activeKeys.includes('parameters');
        const inProperties = activeKeys.includes('properties');
        const inMetadata = activeKeys.includes('metadata');
        const inSpec = activeKeys.includes('spec');
        const inOutput = activeKeys.includes('output');
        const inLinks = activeKeys.includes('links');
        
        
        return {
          inSteps,
          inInput,
          inParameters,
          inProperties,
          inMetadata,
          inSpec,
          inOutput,
          inLinks,
          actionId,
          cursorIndent
        };
      };
      
      // Register custom completion provider for YAML
      try {
        monaco.languages.registerCompletionItemProvider('yaml', {
          provideCompletionItems: (model: any, position: any) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };
            
            const line = model.getLineContent(position.lineNumber);
            const beforeCursor = line.substring(0, position.column - 1);
            const trimmedBefore = beforeCursor.trim();
            const lineIndent = line.search(/\S/) === -1 ? 0 : line.search(/\S/);
            
            const suggestions: any[] = [];
            const context = analyzeContext(model, position);
            
            // Helper: Extract parameter names from document
            const getParameterNames = (): string[] => {
              const lines = model.getLinesContent();
              const paramNames: string[] = [];
              let inProperties = false;
              let propertiesIndent = -1;
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const indent = line.search(/\S/);
                const trimmed = line.trim();
                
                if (trimmed === 'properties:') {
                  // Check if this is under parameters section (look back)
                  let isParamProperties = false;
                  for (let j = i - 1; j >= 0; j--) {
                    const prevTrimmed = lines[j].trim();
                    if (prevTrimmed.startsWith('parameters:')) {
                      isParamProperties = true;
                      break;
                    }
                    if (prevTrimmed === 'spec:' || prevTrimmed === 'steps:') break;
                  }
                  
                  if (isParamProperties) {
                    inProperties = true;
                    propertiesIndent = indent;
                  }
                } else if (inProperties) {
                  // Check if we're still in properties
                  if (indent <= propertiesIndent) {
                    inProperties = false;
                  } else {
                    // Extract parameter name
                    const paramMatch = trimmed.match(/^([a-zA-Z0-9_-]+):/);
                    if (paramMatch && indent === propertiesIndent + 2) {
                      paramNames.push(paramMatch[1]);
                    }
                  }
                }
              }
              
              return paramNames;
            };
            
            // Helper: Extract step IDs from document
            const getStepIds = (): string[] => {
              const lines = model.getLinesContent();
              const stepIds: string[] = [];
              
              for (let i = 0; i < lines.length; i++) {
                const trimmed = lines[i].trim();
                const idMatch = trimmed.match(/^- id:\s*(.+)$/);
                if (idMatch) {
                  stepIds.push(idMatch[1].trim());
                }
              }
              
              return stepIds;
            };
            
            // Helper: Find action ID for a given step ID
            const findActionForStepId = (stepId: string): string | null => {
              const lines = model.getLinesContent();
              let foundStep = false;
              
              for (let i = 0; i < lines.length; i++) {
                const trimmed = lines[i].trim();
                
                // Look for step with this ID
                if (trimmed === `- id: ${stepId}` || trimmed === `id: ${stepId}`) {
                  foundStep = true;
                  continue;
                }
                
                // If we found the step, look for action on next few lines
                if (foundStep) {
                  const actionMatch = trimmed.match(/^action:\s*(.+)$/);
                  if (actionMatch) {
                    return actionMatch[1].trim();
                  }
                  
                  // Stop if we hit another step
                  if (trimmed.startsWith('- id:')) {
                    break;
                  }
                }
              }
              
              return null;
            };
            
            // 0. Expression autocomplete for parameters and steps
            
            // 0a. Step output properties: ${{ steps['stepId'].output.
            const stepOutputMatch = beforeCursor.match(/\$\{\{\s*steps\[['"]([^'"]+)['"]\]\.output\.(\w*)$/);
            if (stepOutputMatch) {
              const [, stepId] = stepOutputMatch;
              const actionId = findActionForStepId(stepId);
              
              if (actionId) {
                const action = availableActions.find(a => a.id === actionId);
                if (action && action.schema?.output?.properties) {
                  Object.entries(action.schema.output.properties).forEach(([key, schema]: [string, any]) => {
                    suggestions.push({
                      label: key,
                      kind: monaco.languages.CompletionItemKind.Property,
                      insertText: key,
                      detail: `${schema.title || key} (${actionId} output)`,
                      documentation: schema.description || `Output from ${stepId}`,
                      range: range,
                    });
                  });
                  
                  if (suggestions.length > 0) {
                    return { suggestions };
                  }
                }
              }
            }
            
            // 0b. Step IDs in bracket notation: ${{ steps['
            const stepBracketMatch = beforeCursor.match(/\$\{\{\s*steps\[['"](\w*)$/);
            if (stepBracketMatch) {
              const stepIds = getStepIds();
              stepIds.forEach(stepId => {
                suggestions.push({
                  label: stepId,
                  kind: monaco.languages.CompletionItemKind.Variable,
                  insertText: stepId + "']",
                  documentation: `Step: ${stepId}`,
                  range: range,
                });
              });
              return { suggestions };
            }
            
            // 0c. Parameter/step names in dot notation: ${{ parameters. or ${{ steps.
            const expressionMatch = beforeCursor.match(/\$\{\{\s*(parameters|steps)\.(\w*)$/);
            if (expressionMatch) {
              const [, type] = expressionMatch;
              
              if (type === 'parameters') {
                const paramNames = getParameterNames();
                paramNames.forEach(paramName => {
                  suggestions.push({
                    label: paramName,
                    kind: monaco.languages.CompletionItemKind.Variable,
                    insertText: paramName,
                    documentation: `Parameter: ${paramName}`,
                    range: range,
                  });
                });
                return { suggestions };
              } else if (type === 'steps') {
                const stepIds = getStepIds();
                stepIds.forEach(stepId => {
                  suggestions.push({
                    label: stepId,
                    kind: monaco.languages.CompletionItemKind.Variable,
                    insertText: stepId,
                    documentation: `Step: ${stepId}`,
                    range: range,
                  });
                });
                return { suggestions };
              }
            }
            
            // 0d. Step output properties with dot notation: ${{ steps.stepId.output.
            const stepOutputDotMatch = beforeCursor.match(/\$\{\{\s*steps\.([a-zA-Z0-9_-]+)\.output\.(\w*)$/);
            if (stepOutputDotMatch) {
              const [, stepId] = stepOutputDotMatch;
              const actionId = findActionForStepId(stepId);
              
              if (actionId) {
                const action = availableActions.find(a => a.id === actionId);
                if (action && action.schema?.output?.properties) {
                  Object.entries(action.schema.output.properties).forEach(([key, schema]: [string, any]) => {
                    suggestions.push({
                      label: key,
                      kind: monaco.languages.CompletionItemKind.Property,
                      insertText: key,
                      detail: `${schema.title || key} (${actionId} output)`,
                      documentation: schema.description || `Output from ${stepId}`,
                      range: range,
                    });
                  });
                  
                  if (suggestions.length > 0) {
                    return { suggestions };
                  }
                }
              }
            }
            
            // 1. Action IDs after "action:" (with or without space)
            if (trimmedBefore === 'action:' || beforeCursor.match(/action:\s+$/)) {
              availableActions.forEach(action => {
                suggestions.push({
                  label: action.id,
                  kind: monaco.languages.CompletionItemKind.Value,
                  detail: action.name,
                  documentation: action.description || '',
                  insertText: action.id,
                  range: range,
                });
              });
              return { suggestions };
            }
            
            // 2. Step properties (id, name, action, input) - when in steps at step level
            if (context.inSteps && !context.inInput && trimmedBefore === '') {
              const stepProps = [
                { key: 'id', doc: 'Unique identifier for this step' },
                { key: 'name', doc: 'Human-readable name for this step' },
                { key: 'action', doc: 'The action to execute' },
                { key: 'input', doc: 'Input parameters for the action' },
                { key: 'if', doc: 'Conditional expression to execute this step' },
              ];
              
              stepProps.forEach(({ key, doc }) => {
                suggestions.push({
                  label: key,
                  kind: monaco.languages.CompletionItemKind.Property,
                  insertText: key + ': ',
                  documentation: doc,
                  range: range,
                });
              });
              
              return { suggestions };
            }
            
            // 3. Action-specific input properties (only when INSIDE input block)
            if (context.inInput && context.actionId && trimmedBefore === '') {
              const action = availableActions.find(a => a.id === context.actionId);
              
              if (action && action.schema?.input?.properties) {
                Object.entries(action.schema.input.properties).forEach(([key, schema]: [string, any]) => {
                  suggestions.push({
                    label: key,
                    kind: monaco.languages.CompletionItemKind.Property,
                    insertText: key + ': ',
                    detail: `${schema.title || key} (${context.actionId})`,
                    documentation: schema.description || `Input for ${context.actionId}`,
                    range: range,
                    sortText: `0_${key}`,
                  });
                });
                
                if (suggestions.length > 0) {
                  return { suggestions };
                }
              }
            }
            
            // 4. UI:options properties (context-aware based on ui:field) - CHECK FIRST!
            if (context.inParameters && context.inProperties && trimmedBefore === '') {
              // Check if we're inside ui:options
              const lines = model.getLinesContent();
              let inUiOptions = false;
              let uiFieldValue: string | null = null;
              
              // Scan backwards to find ui:options and ui:field
              for (let i = position.lineNumber - 2; i >= 0; i--) {
                const line = lines[i];
                const trimmed = line.trim();
                const indent = line.search(/\S/);
                
                if (indent < lineIndent - 2) break; // Out of current field scope
                
                if (trimmed === 'ui:options:') {
                  inUiOptions = true;
                }
                
                const fieldMatch = trimmed.match(/^ui:field:\s*(.+)$/);
                if (fieldMatch) {
                  uiFieldValue = fieldMatch[1].trim();
                }
              }
              
              if (inUiOptions) {
                // Provide options based on ui:field type
                const optionsMap: { [key: string]: Array<{key: string, doc: string}> } = {
                  'EntityPicker': [
                    { key: 'catalogFilter', doc: 'Filter entities by kind, type, spec fields' },
                    { key: 'defaultKind', doc: 'Default kind to use' },
                    { key: 'defaultNamespace', doc: 'Default namespace to use' },
                    { key: 'allowArbitraryValues', doc: 'Allow manual entity refs' },
                  ],
                  'RepoUrlPicker': [
                    { key: 'allowedHosts', doc: 'List of allowed Git hosts (github.com, gitlab.com)' },
                    { key: 'allowedOwners', doc: 'List of allowed organization/owners' },
                    { key: 'allowedRepos', doc: 'List of allowed repositories' },
                    { key: 'requestUserCredentials', doc: 'Request user credentials for private repos' },
                  ],
                  'OwnerPicker': [
                    { key: 'catalogFilter', doc: 'Filter by kind (User or Group)' },
                    { key: 'allowArbitraryValues', doc: 'Allow manual entity refs' },
                  ],
                  'OwnedEntityPicker': [
                    { key: 'catalogFilter', doc: 'Filter entities by kind, type' },
                    { key: 'defaultKind', doc: 'Default kind to show' },
                  ],
                  'textarea': [
                    { key: 'rows', doc: 'Number of visible text rows' },
                  ],
                  'array': [
                    { key: 'addable', doc: 'Allow adding new items' },
                    { key: 'orderable', doc: 'Allow reordering items' },
                    { key: 'removable', doc: 'Allow removing items' },
                  ],
                };
                
                // Common options for all fields
                const commonOptions = [
                  { key: 'allowArbitraryValues', doc: 'Allow custom values beyond suggestions' },
                  { key: 'rows', doc: 'Number of rows (for textarea)' },
                  { key: 'addable', doc: 'Allow adding items (for arrays)' },
                  { key: 'orderable', doc: 'Allow reordering (for arrays)' },
                  { key: 'removable', doc: 'Allow removing items (for arrays)' },
                ];
                
                const options = uiFieldValue && optionsMap[uiFieldValue] 
                  ? optionsMap[uiFieldValue] 
                  : commonOptions;
                
                options.forEach(({ key, doc }) => {
                  suggestions.push({
                    label: key,
                    kind: monaco.languages.CompletionItemKind.Property,
                    insertText: key + ': ',
                    documentation: doc,
                    range: range,
                  });
                });
                
                return { suggestions };
              }
              
              // If NOT in ui:options, show general parameter properties
              const paramProps = [
                { key: 'title', doc: 'Display title for this field' },
                { key: 'type', doc: 'Data type (string, number, boolean, array, object)' },
                { key: 'description', doc: 'Help text for this field' },
                { key: 'default', doc: 'Default value' },
                { key: 'enum', doc: 'List of allowed values' },
                { key: 'enumNames', doc: 'Friendly names for enum values' },
                { key: 'pattern', doc: 'Regex pattern for validation' },
                { key: 'minLength', doc: 'Minimum string length' },
                { key: 'maxLength', doc: 'Maximum string length' },
                { key: 'minimum', doc: 'Minimum numeric value' },
                { key: 'maximum', doc: 'Maximum numeric value' },
                { key: 'items', doc: 'Array item schema' },
                { key: 'minItems', doc: 'Minimum array length' },
                { key: 'maxItems', doc: 'Maximum array length' },
                { key: 'uniqueItems', doc: 'Require unique array items' },
                { key: 'ui:field', doc: 'Custom field component' },
                { key: 'ui:widget', doc: 'UI widget type (textarea, radio, checkboxes)' },
                { key: 'ui:options', doc: 'UI configuration options' },
                { key: 'ui:help', doc: 'Help text displayed below field' },
                { key: 'ui:placeholder', doc: 'Placeholder text' },
                { key: 'ui:autofocus', doc: 'Auto-focus this field' },
              ];
              
              paramProps.forEach(({ key, doc }) => {
                suggestions.push({
                  label: key,
                  kind: monaco.languages.CompletionItemKind.Property,
                  insertText: key + ': ',
                  documentation: doc,
                  range: range,
                });
              });
              
              return { suggestions };
            }
            
            // 5. Type values after "type:" in parameters
            if (beforeCursor.match(/type:\s*$/) && context.inParameters) {
              const types = [
                { value: 'string', doc: 'Text value' },
                { value: 'number', doc: 'Numeric value (float)' },
                { value: 'integer', doc: 'Whole number' },
                { value: 'boolean', doc: 'True or false' },
                { value: 'array', doc: 'List of items' },
                { value: 'object', doc: 'Nested object with properties' },
                { value: 'null', doc: 'Null value (for markdown blocks)' },
              ];
              types.forEach(({ value, doc }) => {
                suggestions.push({
                  label: value,
                  kind: monaco.languages.CompletionItemKind.Value,
                  insertText: value,
                  documentation: doc,
                  range: range,
                });
              });
              return { suggestions };
            }
            
            // 5b. UI widget values after "ui:widget:"
            if (beforeCursor.match(/ui:widget:\s*$/)) {
              const widgets = [
                { value: 'textarea', doc: 'Multi-line text input' },
                { value: 'radio', doc: 'Radio button group' },
                { value: 'checkboxes', doc: 'Multiple checkboxes' },
                { value: 'select', doc: 'Dropdown select' },
                { value: 'password', doc: 'Password input (masked)' },
              ];
              widgets.forEach(({ value, doc }) => {
                suggestions.push({
                  label: value,
                  kind: monaco.languages.CompletionItemKind.Value,
                  insertText: value,
                  documentation: doc,
                  range: range,
                });
              });
              return { suggestions };
            }
            
            // 6. UI field types after "ui:field:"
            if (beforeCursor.match(/ui:field:\s*$/)) {
              // Use discovered field extensions if available, otherwise fallback to common ones
              const fieldTypes = fieldExtensions.length > 0 
                ? fieldExtensions 
                : ['EntityPicker', 'RepoUrlPicker', 'OwnerPicker', 'EntityNamePicker',
                   'OwnedEntityPicker', 'EntityTagsPicker', 'MyGroupsPicker',
                   'RepositoryPicker', 'MultiEntityPicker'];
              
              fieldTypes.forEach(field => {
                suggestions.push({
                  label: field,
                  kind: monaco.languages.CompletionItemKind.Value,
                  insertText: field,
                  range: range,
                });
              });
              return { suggestions };
            }
            
            // 7. Top-level properties (only at root, not in any context)
            if (lineIndent === 0 && trimmedBefore === '' && !context.inSpec && !context.inMetadata) {
              ['apiVersion', 'kind', 'metadata', 'spec'].forEach(prop => {
                suggestions.push({
                  label: prop,
                  kind: monaco.languages.CompletionItemKind.Property,
                  insertText: prop + ': ',
                  range: range,
                });
              });
              return { suggestions };
            }
            
            // 8. Spec properties (only when in spec but not in nested contexts)
            if (context.inSpec && !context.inSteps && !context.inParameters && !context.inMetadata && trimmedBefore === '') {
              ['owner', 'type', 'parameters', 'steps', 'output'].forEach(prop => {
                suggestions.push({
                  label: prop,
                  kind: monaco.languages.CompletionItemKind.Property,
                  insertText: prop + ': ',
                  range: range,
                });
              });
              return { suggestions };
            }
            
            // 9. Metadata properties (only when in metadata, not in nested contexts)
            if (context.inMetadata && !context.inSpec && !context.inSteps && trimmedBefore === '') {
              ['name', 'title', 'description', 'labels', 'tags', 'annotations'].forEach(prop => {
                suggestions.push({
                  label: prop,
                  kind: monaco.languages.CompletionItemKind.Property,
                  insertText: prop + ': ',
                  range: range,
                });
              });
              return { suggestions };
            }
            
            return { suggestions };
          },
        });
      } catch (error) {
        // Silently fail - editor will work without autocomplete
      }
    },
    [availableActions]
  );

  const handleChange = useCallback(
    (newValue: string | undefined) => {
      if (newValue !== undefined && newValue !== value) {
        onChange(newValue);
        
        // Validate
        const parseResult = parseYAML(newValue);
        const valid = parseResult.valid && isValidTemplateYAML(newValue);
        
        setIsValid(valid);
        setErrors(parseResult.error ? [parseResult.error] : []);
        
        if (onValidationChange) {
          onValidationChange(valid);
        }
      }
    },
    [value, onChange, onValidationChange]
  );

  // Validate on mount
  useEffect(() => {
    const parseResult = parseYAML(value);
    const valid = parseResult.valid && isValidTemplateYAML(value);
    setIsValid(valid);
    setErrors(parseResult.error ? [parseResult.error] : []);
    
    if (onValidationChange) {
      onValidationChange(valid);
    }
  }, [value, onValidationChange]);

  return (
    <Paper className={classes.root}>
      <Box className={classes.header}>
        <Typography variant="h6">YAML Editor</Typography>
        <Box display="flex" style={{ gap: 8 }}>
          {isValid ? (
            <Chip
              label="Valid"
              size="small"
              style={{ backgroundColor: '#4caf50', color: 'white' }}
            />
          ) : (
            <Chip
              label="Invalid"
              size="small"
              style={{ backgroundColor: '#f44336', color: 'white' }}
            />
          )}
          {readOnly && (
            <Chip label="Read-only" size="small" variant="outlined" />
          )}
        </Box>
      </Box>

      <Box className={classes.editorContainer} style={{ isolation: 'isolate', contain: 'layout style paint' }}>
        {value !== undefined && value !== null ? (
          <MonacoErrorBoundary>
            <Box style={{ 
              height: '100%', 
              width: '100%',
              overflow: 'hidden',
              position: 'relative',
              padding: '0 10px',
            }}>
              <Editor
                height="100%"
                defaultLanguage="yaml"
                value={value}
                onChange={handleChange}
                onMount={handleEditorDidMount}
                theme={monacoTheme}
                options={{
                  readOnly,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  renderWhitespace: 'selection',
                  tabSize: 2,
                  insertSpaces: true,
                  folding: true,
                  wordWrap: 'on',
                  wrappingStrategy: 'advanced',
                  formatOnPaste: false,
                  formatOnType: false,
                  automaticLayout: true,
                  domReadOnly: readOnly,
                  stopRenderingLineAfter: 10000,
                  disableLayerHinting: true,
                  padding: { top: 0, bottom: 0, left: 5, right: 5 },
                }}
              />
            </Box>
          </MonacoErrorBoundary>
        ) : (
          <Box p={2}>
            <Typography color="error">Editor value is undefined or null</Typography>
          </Box>
        )}
      </Box>

      {errors.length > 0 && (
        <Box className={classes.errorList}>
          {errors.map((error, index) => (
            <Alert key={index} severity="error" variant="outlined">
              {error}
            </Alert>
          ))}
        </Box>
      )}

      <Box className={classes.statusBar}>
        <Typography variant="caption" color="textSecondary">
          Lines: {value.split('\n').length}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          •
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Changes sync automatically
        </Typography>
      </Box>
    </Paper>
  );
}
