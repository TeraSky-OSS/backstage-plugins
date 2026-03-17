# Configuring VCF Operations Frontend Plugin

This guide covers how to configure and customize the VCF Operations Frontend plugin for your organization's needs.

## New Frontend System Configuration (Alpha)

When using the new frontend system through the `/alpha` export, the plugin is configured automatically with sensible defaults. The configuration options described below are still available and can be customized through the app configuration.

## Basic Configuration

The frontend plugin automatically inherits configuration from the backend plugin, but you can customize the user experience through various options.


## Permission Configuration

### Basic Permission Control

Configure permissions in your `app-config.yaml`:

```yaml
permission:
  enabled: true
  rules:
    - allow: [vcf-operations.metrics.view]
      resourceType: entity
      conditions:
        anyOf:
          - rule: HAS_TAG
            params:
              tag: 'vcf-monitored'
```

### Role-Based Access Control

Configure different access levels:

```yaml
permission:
  enabled: true
  rules:
    # Infrastructure team - full access
    - allow: [vcf-operations.metrics.view]
      resourceType: entity
      conditions:
        allOf:
          - rule: HAS_ANNOTATION
            params:
              annotation: 'backstage.io/managed-by-location'
          - rule: IS_ENTITY_OWNER
            params:
              claims: ['group:infrastructure']

    # Developers - limited access to their resources
    - allow: [vcf-operations.metrics.view]
      resourceType: entity
      conditions:
        anyOf:
          - rule: IS_ENTITY_OWNER
          - rule: HAS_SPEC
            params:
              key: 'owner'
              value: 'user:$user'
```

### Environment-Based Permissions

Different permissions for different environments:

```yaml
permission:
  enabled: true
  rules:
    # Production - restricted access
    - allow: [vcf-operations.metrics.view]
      resourceType: entity
      conditions:
        allOf:
          - rule: HAS_TAG
            params:
              tag: 'environment:production'
          - rule: IS_ENTITY_OWNER
            params:
              claims: ['group:platform-team']

    # Development - open access
    - allow: [vcf-operations.metrics.view]
      resourceType: entity
      conditions:
        anyOf:
          - rule: HAS_TAG
            params:
              tag: 'environment:development'
```

## Entity Configuration

### Virtual Machine Configuration

Configure entity metadata for VM monitoring:

```yaml
# catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: web-server-vm
  title: Web Server (Standalone)
  tags:
    - kind:virtualmachine
    - standalone-resource
    - vcf-monitored
  annotations:
    backstage.io/managed-by-location: 'url:https://github.com/company/infrastructure'
  links:
    - url: https://vcfa.company.com/automation/#/machines/remote-console/vra/cluster/web-server
      title: Open Remote Console
spec:
  type: virtual-machine
  owner: team:infrastructure
  lifecycle: production
```

### Non-Standalone VM Configuration

For VMs managed through VCF Automation:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: app-server
  title: Application Server
  tags:
    - kind:virtualmachine
    - vcf-monitored
  links:
    - url: https://vcfa.company.com/automation/#/build-and-deploy/all-resources/deployments/abc123
      title: Open in VCF Automation
    - url: https://vcfa.company.com/automation/#/machines/remote-console/vra/cluster-01/app-server-vm
      title: Open Remote Console  # This link is used for resource discovery
spec:
  type: virtual-machine
  owner: team:development
```

### Supervisor Namespace Configuration

For CCI namespace monitoring:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: k8s-namespace
  title: Kubernetes Namespace
  tags:
    - vcf-monitored
  annotations:
    terasky.backstage.io/vcf-automation-cci-namespace-endpoint: 'https://vcfa.company.com/proxy/k8s/namespaces/urn:vcloud:namespace:abc123-def456'
spec:
  type: namespace
  owner: team:platform
```

### VCF Automation Project Configuration

For project-level monitoring:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Domain
metadata:
  name: web-services-project
  title: Web Services Project
  tags:
    - vcf-monitored
spec:
  type: vcf-automation-project
  owner: team:web-services
```

The VCF Operations Frontend plugin provides extensive configuration options to adapt to your organization's monitoring needs and user experience requirements.