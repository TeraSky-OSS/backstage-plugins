# Entity Scaffolder Content Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-entity-scaffolder-content/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-entity-scaffolder-content) ![NPM Downloads](https://img.shields.io/npm/dy/@terasky/backstage-plugin-entity-scaffolder-content)

## Overview

The Entity Scaffolder Content frontend plugin enhances Backstage's scaffolder functionality by allowing you to embed template selection and creation directly within entity pages. This integration provides a more contextual and streamlined experience for users working with templates.

## Features

### Template Integration
- Embed scaffolder templates in entity pages
- Add dedicated template tabs to entity layouts
- Seamless integration with existing entity pages

### Context-Aware Filtering
- Filter templates based on entity metadata
- Custom filter rules and conditions
- Group templates by categories
- Dynamic template visibility

### Data Pre-population
- Auto-fill template forms with entity data
- Dynamic value mapping
- Custom data transformation
- Context-aware defaults

### User Interface
- Clean and intuitive template browsing
- Consistent Backstage design language
- Responsive layout
- Integrated form handling

## Components

### EntityScaffolderContent
The main component that provides:

- Template listing and filtering
- Integration with entity context
- Template form rendering
- Data pre-population logic

Example usage:
```typescript
<EntityScaffolderContent
  templateGroupFilters={[
    {
      title: 'Crossplane Claims',
      filter: (entity, template) =>
        template.metadata?.labels?.forEntity === 'system' &&
        entity.spec?.type === 'kubernetes-namespace',
    },
  ]}
  buildInitialState={entity => ({
    xrNamespace: entity.metadata.name,
    clusters: [entity.metadata?.annotations?.['backstage.io/managed-by-location']?.split(": ")[1] ?? '']
  })}
/>
```

### Template Filters
Configure how templates are filtered and grouped:

- Define filter conditions
- Group templates by purpose
- Apply entity-specific rules
- Handle template metadata

### Initial State Builder
Customize how entity data maps to template fields:

- Transform entity metadata
- Set default values
- Handle complex data structures
- Apply business logic

## Technical Details

### Integration Points
- Backstage Scaffolder
- Entity Catalog
- Template Engine
- Form System

### Component Props

#### EntityScaffolderContent
- `templateGroupFilters`: Define template filtering and grouping
- `buildInitialState`: Map entity data to template fields
- `additionalTemplateFilters`: Extra template filtering rules
- `defaultCategory`: Default template category

## User Experience

### Template Discovery
1. Navigate to an entity page
2. Access the templates tab
3. View filtered, relevant templates
4. Select appropriate template

### Template Usage
1. Choose a template
2. Review pre-populated data
3. Fill remaining fields
4. Create from template

### Template Filtering
1. Templates filtered automatically
2. Grouped by configured categories
3. Only relevant templates shown
4. Entity context considered 