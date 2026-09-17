# XRD Custom Form Fields with `x-ui-field` and `x-ui-options`

The `kubernetes-ingestor` plugin supports two vendor extensions on XRD
`openAPIV3Schema` properties for configuring Backstage scaffolder form fields:

- `x-ui-field` selects a registered Backstage field extension.
- `x-ui-options` supplies that field extension's options.

The plugin converts them to `ui:field` and `ui:options` in the generated template
and removes the `x-ui-*` markers. The extensions work on top-level properties,
nested object properties, and array item schemas.

## Example

```yaml
# inside openAPIV3Schema.properties.spec.properties
service:
  type: string
  x-ui-field: EntityPicker
  x-ui-options:
    catalogFilter:
      kind: Component
    allowArbitraryValues: false
```

This generates the following form field configuration:

```yaml
service:
  type: string
  ui:field: EntityPicker
  ui:options:
    catalogFilter:
      kind: Component
    allowArbitraryValues: false
```

The selected field extension must be registered in the Backstage frontend.

## Customizing the generated Owner picker

When the XRD has a `spec.owner` property, its `x-ui-field` and `x-ui-options`
also configure the Owner field in the generated Resource Metadata section. This
allows each XRD to constrain ownership independently.

```yaml
# inside openAPIV3Schema.properties.spec.properties
owner:
  description: Owning Backstage group entity reference.
  type: string
  x-ui-field: OwnerPicker
  x-ui-options:
    catalogFilter:
      kind: Group
      spec.type: team
    allowArbitraryValues: false
```

Without these extensions, the metadata Owner field retains its existing defaults:
`OwnerPicker` with a `kind: Group` catalog filter.
