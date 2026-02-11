# Template Builder Plugin

The Template Builder plugin for Backstage provides a powerful visual WYSIWYG editor for creating and editing Backstage Software Templates. It enables teams to build templates through an intuitive drag-and-drop interface without manual YAML editing.

## Plugin Components

### Frontend Plugin
The frontend plugin provides a comprehensive visual editor with:

- **Interactive Workflow Canvas**: Drag-and-drop interface using React Flow for designing template steps
- **Real-time YAML Synchronization**: Monaco editor with bidirectional sync between visual and YAML views
- **Intelligent Autocomplete**: Context-aware suggestions for actions, parameters, step outputs, and secrets
- **Input Designer**: Visual form builder supporting all field types including custom field extensions
- **Template Validation**: Real-time validation of template structure and action configurations
- **Graph Layout**: Automatic horizontal/vertical layout with visual connections between steps

[Learn more about the frontend plugin](./frontend/about.md)

## Documentation Structure
- [About](./frontend/about.md)
- [Installation](./frontend/install.md)
- [Configuration](./frontend/configure.md)

## Key Features

### Visual Workflow Design
Build complex multi-step templates using an interactive graph-based interface that automatically shows relationships between parameters, actions, and outputs.

### Field Extension Discovery
Automatically discovers and supports all registered Backstage field extensions, including custom ones from your organization.

### Monaco YAML Editor
Professional YAML editing experience with:
- Syntax highlighting
- Intelligent autocomplete for actions and parameters
- Real-time validation
- Format-on-save

### Template Management
- Create templates from scratch
- Load existing templates from the catalog
- Download templates as YAML files
- Entity action integration for quick template editing

## Supported Features

### Input Parameters
- All JSON Schema types (string, number, boolean, array, object)
- All built-in Backstage field extensions
- Custom field extensions (auto-discovered)
- Validation rules and dependencies
- Conditional fields

### Action Steps
- Visual action palette with all registered scaffolder actions
- Drag-and-drop action placement
- Input mapping from parameters and previous step outputs
- Output tracking and visualization
- Conditional execution support

### Template Outputs
- Define output links
- Reference step outputs
- Automatic connection visualization

## Getting Started

To get started with the Template Builder plugin:

1. Install the plugin in your Backstage instance
2. Add the builder route to your app
3. Start creating templates visually

For detailed installation and configuration instructions, refer to:

- [About the plugin](./frontend/about.md)
- [Installation Guide](./frontend/install.md)
- [Configuration Guide](./frontend/configure.md)
