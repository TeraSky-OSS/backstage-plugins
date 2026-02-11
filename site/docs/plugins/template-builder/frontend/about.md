# Template Builder Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-template-builder/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-template-builder)

## Overview

The Template Builder frontend plugin provides a powerful visual editor for creating and managing Backstage Software Templates. It combines a drag-and-drop workflow canvas with intelligent YAML editing to streamline template creation for both technical and non-technical users.

## Features

### Visual Workflow Canvas
- **React Flow Integration**: Interactive graph-based interface for designing template workflows
- **Drag-and-Drop Actions**: Visual action palette with all registered scaffolder actions
- **Automatic Layout**: Smart horizontal and vertical layout with automatic edge detection
- **Connection Visualization**: Visual representation of data flow between parameters, actions, and outputs
- **Graph Customization**: Collapsible legend, zoom controls, and minimap

### Input Parameter Designer
- **Visual Form Builder**: Create input forms without writing YAML
- **All Field Types**: Support for string, number, boolean, array, object, and more
- **Field Extension Support**: Automatically discovers and integrates custom field extensions
- **Validation Rules**: Configure required fields, validation patterns, and dependencies
- **Conditional Fields**: Set up field dependencies and conditional rendering

### Monaco YAML Editor
- **Professional Editor**: Full-featured Monaco editor with syntax highlighting
- **Intelligent Autocomplete**: Context-aware suggestions for:
    - Scaffolder action IDs
    - Action-specific input properties
    - Template parameters
    - Step outputs
    - Secret references
- **Real-time Validation**: Instant feedback on YAML syntax and template structure
- **Bidirectional Sync**: Changes in visual editor reflect in YAML and vice versa
- **Format Support**: Automatic formatting and indentation

### Template Validation
- **Structure Validation**: Ensures required metadata and spec fields are present
- **Action Validation**: Verifies action IDs and required inputs
- **Reference Validation**: Checks parameter and step output references
- **Real-time Feedback**: Visual error indicators and detailed error messages

### Template Management
- **Create from Scratch**: Start with empty template and build visually
- **Load from Catalog**: Import existing templates for editing
- **Download as YAML**: Export templates to local filesystem
- **Entity Action**: Quick access from template entity pages

## Components

### TemplateBuilderPage
The main editor component that provides the complete template building experience:
- Split-pane layout with workflow canvas, YAML editor, and side panels
- Toolbar with validation, download, and layout controls
- Real-time state management and synchronization

### WorkflowCanvas
Interactive graph visualization component:
- Custom nodes for parameters, actions, and outputs
- Automatic edge generation based on data dependencies
- Action palette for adding new steps
- Context-sensitive action configuration forms

### InputDesigner
Visual input parameter configuration interface:
- Parameter list with field management
- Field type selector with extension support
- Property editor for all field options
- Preview of generated JSON Schema

### YAMLEditor
Advanced Monaco-based YAML editor:
- Scaffolder action autocomplete
- Parameter and output reference completion
- Syntax validation and error highlighting
- Dark/light theme support

## Technical Details

### Field Extension Discovery
The plugin automatically discovers registered field extensions at runtime:
- Queries the Backstage scaffolder API
- Extracts field extension definitions
- Makes them available in the input designer
- No hardcoded field types

### State Management
Uses React hooks for state management:
- `useTemplateState`: Central state management for template data
- Immutable updates with proper re-rendering
- Undo/redo support (planned)

### Data Flow
- Visual changes update central state
- State changes trigger YAML regeneration
- YAML changes parse back to state
- All changes synchronized across views

### Integration Points
- Backstage Catalog API
- Scaffolder Backend API
- Custom Field Extensions
- Entity Actions

## User Experience

### Workflow
1. Start with metadata configuration
2. Design input parameters visually or in YAML
3. Add action steps from palette
4. Configure action inputs with autocomplete
5. Define template outputs
6. Validate and download

### Best Practices
- Use visual editor for structure, YAML for fine-tuning
- Leverage autocomplete for correct action IDs and properties
- Validate frequently to catch errors early
- Test downloaded templates in scaffolder before committing
