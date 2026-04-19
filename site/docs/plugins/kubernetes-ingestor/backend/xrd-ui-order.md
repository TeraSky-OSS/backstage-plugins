# XRD Field Ordering with `x-ui-order`

The `kubernetes-ingestor` plugin supports the `x-ui-order` vendor extension on XRD spec fields.
When present, the plugin uses these annotations to control the order in which fields appear in
the generated Backstage scaffolder template.

## How it works

During template generation the plugin processes every XRD version's `openAPIV3Schema`.
For the top-level `spec` properties it applies the following rules:

1. Fields that carry an `x-ui-order: <number>` annotation are placed **first**, sorted in
   ascending numeric order.
2. Fields **without** `x-ui-order` are appended **after** the ordered fields, sorted
   alphabetically by key name.
3. If **no** field in a spec carries `x-ui-order`, the original schema order is preserved
   unchanged.

For nested fields (array items and inline objects) the plugin generates a
[`ui:order`](https://rjsf-team.github.io/react-jsonschema-form/docs/api-reference/uiSchema/#uiorder)
array in the `uiSchema` so the Backstage form renderer respects the intended order:

- `array` field → `items['ui:order']` is set to `[...orderedKeys, '*']`
- `object` field → `field['ui:order']` is set to `[...orderedKeys, '*']`

The trailing `'*'` wildcard ensures any extra field not listed explicitly is still rendered.

---

## Example XRD

Below is a trimmed `CompositeResourceDefinition` for a generic compute deployment that
demonstrates `x-ui-order` on both top-level spec fields and nested array-item properties.

```yaml
---
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  annotations:
    terasky.backstage.io/add-to-catalog: "true"
  name: commoncustomdeployments.infra.example.com
spec:
  group: infra.example.com
  scope: Cluster
  names:
    kind: CommonCustomDeployment
    plural: commoncustomdeployments
    shortNames:
      - ccd
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          required:
            - spec
          properties:
            spec:
              type: object
              description: Desired state of CommonCustomDeployment.
              properties:

                # ── ordered top-level fields ──────────────────────────────────
                stateful:
                  type: boolean
                  x-ui-order: 1
                  default: false
                  description: Stateful naming mode. Upgrade rollout is disabled when true.

                replicas:
                  type: integer
                  x-ui-order: 2
                  default: 1
                  description: Number of base machine replicas.

                os:
                  type: string
                  x-ui-order: 3
                  description: Base operating-system image key.

                size:
                  type: string
                  x-ui-order: 4
                  description: Instance size / service offering.
                  enum:
                    - vm.xs
                    - vm.s
                    - vm.m
                    - vm.l
                    - vm.xl

                network:
                  type: string
                  x-ui-order: 5
                  default: k8s
                  description: Network key from environment map.
                  enum:
                    - k8s
                    - app

                exposureType:
                  type: string
                  x-ui-order: 6
                  default: None
                  description: Exposure type for service ports.
                  enum:
                    - LoadBalancer
                    - None

                affinity:
                  type: string
                  x-ui-order: 7
                  default: None
                  description: Scheduling affinity rule.
                  enum:
                    - host anti-affinity
                    - host affinity
                    - None

                disks:
                  type: array
                  x-ui-order: 8
                  description: List of additional data disks.
                  items:
                    type: object
                    required:
                      - size
                      - name
                    properties:
                      name:
                        type: string
                      size:
                        type: integer

                additionalNICNetworks:
                  type: array
                  x-ui-order: 9
                  description: Additional NIC networks (max 2).
                  default: []
                  maxItems: 2
                  items:
                    type: string
                    enum:
                      - ingress
                      - egress

                # ── nested x-ui-order on array items ─────────────────────────
                ports:
                  type: array
                  x-ui-order: 10
                  description: Ports exposed via load balancer rules.
                  items:
                    type: object
                    properties:
                      publicPort:
                        type: integer
                        x-ui-order: 1
                        description: Exposed public VIP port.
                      privatePort:
                        type: integer
                        x-ui-order: 2
                        description: Target port on instance.
                      protocol:
                        type: string
                        x-ui-order: 3
                        description: L4 protocol for port forwarding.
                        enum:
                          - tcp
                          - udp

                # ── field without x-ui-order (appended alphabetically) ────────
                tags:
                  type: array
                  description: Arbitrary string tags for grouping.
                  items:
                    type: string
```

### What the plugin generates

Given the XRD above the plugin produces the following for the `Resource Spec` step of the
scaffolder template:

| Position | Field | Reason |
|---|---|---|
| 1 | `stateful` | `x-ui-order: 1` |
| 2 | `replicas` | `x-ui-order: 2` |
| 3 | `os` | `x-ui-order: 3` |
| 4 | `size` | `x-ui-order: 4` |
| 5 | `network` | `x-ui-order: 5` |
| 6 | `exposureType` | `x-ui-order: 6` |
| 7 | `affinity` | `x-ui-order: 7` |
| 8 | `disks` | `x-ui-order: 8` |
| 9 | `additionalNICNetworks` | `x-ui-order: 9` |
| 10 | `ports` | `x-ui-order: 10` |
| 11 | `tags` | no `x-ui-order` → appended alphabetically |

For the `ports` array the plugin also injects `ui:order` into the array-item schema:

```json
"ports": {
  "type": "array",
  "items": {
    "ui:order": ["publicPort", "privatePort", "protocol", "*"]
  }
}
```

This causes the scaffolder form to render each port row with the columns in the intended
order instead of the schema-declaration order.

---

## Rules summary

| Scenario | Behaviour |
|---|---|
| All spec fields have `x-ui-order` | Sorted ascending by value |
| Mix of ordered and unordered fields | Ordered first, then unordered alphabetically |
| No spec field has `x-ui-order` | Original schema order preserved |
| Array item properties have `x-ui-order` | `items['ui:order']` array injected |
| Object properties have `x-ui-order` | `field['ui:order']` array injected |
| Nested fields have no `x-ui-order` | No `ui:order` injected, schema order used |

---

## Notes

- `x-ui-order` must be a **number** (integer or float). String values are ignored.
- The feature only applies to the `spec` object of the XRD schema. Other top-level properties
  (`status`, `metadata`, etc.) are not affected.
- The trailing `'*'` wildcard in generated `ui:order` arrays ensures fields added to the CRD
  after template generation are still rendered in the form.
- `x-ui-order` is a vendor extension and is **not** part of the Kubernetes CRD validation;
  it is stripped from the CRD by the API server and only used at template-generation time by
  this plugin.
