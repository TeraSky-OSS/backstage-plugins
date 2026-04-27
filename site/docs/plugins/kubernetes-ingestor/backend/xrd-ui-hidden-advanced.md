# XRD Form Visibility with `x-ui-hidden` and `x-ui-advanced`

The `kubernetes-ingestor` plugin supports two vendor-extension annotations on XRD
`openAPIV3Schema` properties to control how fields appear in the generated Backstage
scaffolder template form.

Both extensions apply to **XRD only** (`XRDTemplateEntityProvider`).

---

## `x-ui-hidden`

```yaml
# inside openAPIV3Schema.properties.spec.properties
internalRef:
  type: string
  x-ui-hidden: true
```

When `x-ui-hidden: true` is set on a property, the field is **completely excluded** from the
generated JSON Schema that drives the scaffolder form. RJSF never sees it — the field is not
rendered, not validated, and not included in `formData`.

### When to use it

- **Fields in migration** — the XRD schema still contains the field (needed by Crossplane
  compositions or for backward compatibility), but you want to stop exposing it to users while
  the migration is in progress. The field remains valid in the XRD, so Crossplane can still
  read and patch it; it simply does not appear in the Backstage form.
- **Internal / system-managed values** — fields set programmatically by a mutating webhook,
  composition patch, or environment controller that should never be provided by the user.
- **Noisy defaults** — fields whose value is always fixed and clutters the form.

### Scope

The annotation applies to:

- Top-level `spec` properties
- Nested object properties (recursive — any depth)

### Example

```yaml
---
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: myapps.infra.example.com
spec:
  group: infra.example.com
  scope: Cluster
  names:
    kind: MyApp
    plural: myapps
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:

                # Regular field — shown in the form
                replicas:
                  type: integer
                  default: 1
                  description: Number of replicas.

                # Field being migrated away from user input.
                # Crossplane compositions still read it, but users should not set it.
                legacyNetworkMode:
                  type: string
                  x-ui-hidden: true
                  description: >
                    Deprecated internal network selector. Managed by the composition.

                # Nested hidden field
                config:
                  type: object
                  properties:
                    publicEndpoint:
                      type: string
                      description: Public-facing endpoint URL.
                    internalToken:
                      type: string
                      x-ui-hidden: true
                      description: Injected by the mutating webhook — do not set manually.
```

In the example above the Backstage form renders `replicas` and `config.publicEndpoint` but
omits `legacyNetworkMode` and `config.internalToken` entirely.

---

## `x-ui-advanced`

```yaml
debugMode:
  type: boolean
  default: false
  x-ui-advanced: true

timeout:
  type: string
  default: 30s
  x-ui-advanced: true
```

Fields marked with `x-ui-advanced: true` are moved out of the main `properties` section into
a conditional [JSON Schema `if/then` dependency](https://json-schema.org/understanding-json-schema/reference/conditionals.html).
The plugin automatically injects a `showAdvancedSettings` boolean toggle:

```json
{
  "properties": {
    "showAdvancedSettings": {
      "title": "Show Advanced Settings",
      "type": "boolean",
      "default": false
    }
  },
  "dependencies": {
    "showAdvancedSettings": {
      "if": { "properties": { "showAdvancedSettings": { "const": true } } },
      "then": {
        "properties": {
          "debugMode": { "type": "boolean" },
          "timeout":   { "type": "string", "ui:placeholder": "30s" }
        }
      }
    }
  }
}
```

Advanced fields are invisible by default and only revealed once the user enables the toggle.

### Default handling for advanced fields

RJSF auto-populates `formData` with every field that has a `default`, even for fields the user
never touched. For advanced fields this would cause their defaults to appear in every generated
manifest. To prevent silent manifest pollution the plugin applies the following rules when
moving a field to the advanced section:

| Field type | Behaviour |
|---|---|
| Non-boolean with `default` | `default` removed; value moved to `ui:placeholder` (hint text only) |
| Boolean with `default` | `default` removed (booleans cannot use `ui:placeholder`) |
| No `default` | No change |

The `x-ui-advanced` marker is stripped from the field definition before it is placed in the
dependency, so it does not appear in generated YAML.

### Example

```yaml
---
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: myapps.infra.example.com
spec:
  group: infra.example.com
  scope: Cluster
  names:
    kind: MyApp
    plural: myapps
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:

                # Always-visible fields
                replicas:
                  type: integer
                  default: 1

                size:
                  type: string
                  enum: [small, medium, large]

                # Advanced fields — hidden behind the toggle
                debugMode:
                  type: boolean
                  default: false
                  x-ui-advanced: true
                  description: Enable verbose logging (advanced).

                timeout:
                  type: string
                  default: 30s
                  x-ui-advanced: true
                  description: Request timeout override (advanced).

                networking:
                  type: object
                  properties:
                    mode:
                      type: string
                      default: overlay
                    mtu:
                      type: integer
                      default: 1500
                      x-ui-advanced: true  # only mtu is advanced within the object
```

---

## Combining `x-ui-hidden` and `x-ui-advanced`

Both extensions can be used together in the same XRD:

```yaml
spec:
  properties:

    region:
      type: string          # regular visible field

    internalRef:
      type: string
      x-ui-hidden: true      # never shown in the form

    tuning:
      type: string
      default: "auto"
      x-ui-advanced: true    # shown only when "Show Advanced Settings" is toggled
```

---

## Notes

- Both annotations are vendor extensions and are **not** part of Kubernetes CRD validation.
  They are processed at template-generation time by this plugin and have no effect on the
  Crossplane runtime. They apply only to **XRD** (`XRDTemplateEntityProvider`).
- `x-ui-hidden` and `x-ui-advanced` are mutually exclusive on the same field: a field with
  `x-ui-hidden: true` is dropped before the advanced-grouping step, so combining both on one
  field is redundant (the field will simply be hidden).
- For details on controlling field order see
  [XRD Field Ordering (`x-ui-order`)](./xrd-ui-order.md).