# Entity Scaffolder Content Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-entity-scaffolder-content/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-entity-scaffolder-content) ![NPM Downloads](https://img.shields.io/npm/dy/@terasky/backstage-plugin-entity-scaffolder-content)

## Overview

The Entity Scaffolder Content frontend plugin enhances Backstage's scaffolder functionality by allowing you to embed template selection and execution directly within entity pages. This integration provides a more contextual and streamlined experience for users working with templates.

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

### Form Decorator Support
- Backstage [form decorators](https://backstage.io/docs/features/software-templates/experimental/#form-decorators) declared in a template's `spec.formDecorators` are executed automatically before the scaffold call
- Enables use-cases such as fetching an OAuth token (e.g. GitHub) to avoid self-approval of PRs
- Register decorators via `FormDecoratorBlueprint` (new frontend system) — no changes to `EntityScaffolderContent` required

### Automatic Field Extension Discovery
- In the new Backstage frontend system, all `FormFieldBlueprint` extensions are discovered automatically via `formFieldsApiRef` — no need to pass a `ScaffolderFieldExtensions` node manually
- The `ScaffolderFieldExtensions` prop is still supported for explicit / legacy extensions

### Task Progress Display
- After a template is submitted, an inline task progress view is shown
- Displays per-step status and completion indicators
- Streams live task logs
- Shows template output links/values on completion

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
- Template form rendering with field extensions
- Form decorator execution
- Data pre-population logic
- Task progress, logs, and outputs display

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
  buildInitialState={(entity, template) => ({
    xrNamespace: entity.metadata.name,
    clusters: [entity.metadata?.annotations?.['backstage.io/managed-by-location']?.split(': ')[1] ?? '']
  })}
/>
```

### Template Filters
Configure how templates are filtered and grouped:

- Define filter conditions using entity and template data
- Group templates by purpose
- Apply entity-specific rules
- Handle template metadata

### Initial State Builder
Customise how entity data maps to template fields:

- Transform entity metadata
- Set default values
- Handle complex data structures
- Apply business logic

## Technical Details

### Integration Points
- Backstage Scaffolder (native `scaffolderApiRef`)
- Backstage `formDecoratorsApiRef` (form decorator execution)
- Backstage `formFieldsApiRef` (automatic field extension discovery)
- Entity Catalog
- Template Engine

### Component Props

#### EntityScaffolderContent
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `templateGroupFilters` | `Array<{ title?: ReactNode; filter: (entity, template) => boolean }>` | Yes | Defines template filtering and visual grouping |
| `buildInitialState` | `(entity: Entity, template: Template) => Record<string, JsonValue>` | Yes | Maps entity data to template form fields |
| `ScaffolderFieldExtensions` | `ReactNode` | No | Explicit field extensions (optional — extensions are auto-discovered in the new frontend system) |
| `layouts` | `LayoutOptions[]` | No | Custom layout options for the workflow stepper |
| `components.TemplateCard` | `ComponentType<{ template: TemplateEntityV1beta3 }>` | No | Custom component to render each template card |

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
4. Submit — form decorators run automatically before submission
5. Watch inline task progress, live logs, and outputs

### Template Filtering
1. Templates filtered automatically
2. Grouped by configured categories
3. Only relevant templates shown
4. Entity context considered
