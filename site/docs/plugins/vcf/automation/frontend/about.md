# VCF Automation Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcf-automation/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcf-automation)

## Overview

The VCF Automation plugin for Backstage provides visibility into VCF deployments, resources, and projects. It offers detailed views of deployment operations, resource states, and project configurations. The plugin integrates with Backstage's permission framework to ensure secure access control.

## Features

### VSphere VM Management
- Detailed view of VM configurations and status
- VM monitoring and overview
- Configuration management

### Deployment Operations
- Track deployment status and history
- Deployment overview and details
- Operation monitoring

### Resource Management
- Monitor various VCF resource types
- Resource configuration views
- Status tracking

### Project Administration
- Manage VCF project settings
- Resource organization
- Project overview and details

### Permission Integration
- Built-in support for Backstage's permission framework
- Secure access control
- Role-based permissions

### CCI Supervisor Resource Management
- Interactive YAML editing for standalone CCI resources
- Monaco Editor integration with syntax highlighting
- Real-time YAML validation and error feedback
- Modal and tab-based editing interfaces
- Permission-controlled access to editing capabilities

## Components

The plugin provides several components for different entity types:

### Project (Domain) Components
- `VCFAutomationProjectOverview`: High-level project summary
- `VCFAutomationProjectDetails`: Detailed project information

### Deployment Components
- `VCFAutomationDeploymentOverview`: Quick deployment status
- `VCFAutomationDeploymentDetails`: In-depth deployment information

### VSphere VM Components
- `VCFAutomationVSphereVMOverview`: VM status overview
- `VCFAutomationVSphereVMDetails`: Detailed VM configurations

### Generic Resource Components
- `VCFAutomationGenericResourceOverview`: Resource summary
- `VCFAutomationGenericResourceDetails`: Detailed resource information

### CCI Supervisor Components
- `VCFAutomationCCINamespaceOverview`: CCI Supervisor Namespace overview with resource summaries
- `VCFAutomationCCINamespaceDetails`: Detailed CCI Supervisor Namespace configuration and status
- `VCFAutomationCCIResourceOverview`: CCI Supervisor Resource overview with YAML editing modal
- `VCFAutomationCCIResourceDetails`: Detailed CCI Supervisor Resource with integrated YAML editor tab

## Entity Integration

The plugin integrates with the following entity types:

### VSphere VM Component
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-vm
spec:
  type: Cloud.vSphere.Machine
  system: my-deployment  # References parent deployment
```

### VCF Deployment
```yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: my-deployment
  annotations:
    terasky.backstage.io/vcf-automation-deployment-status: 'true'
```

### Generic Resource
```yaml
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: my-resource
  annotations:
    terasky.backstage.io/vcf-automation-resource-type: 'network'
```

### Project (Domain)
```yaml
apiVersion: backstage.io/v1alpha1
kind: Domain
metadata:
  name: my-project
```

### CCI Supervisor Namespace Component
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-cci-namespace
  annotations:
    terasky.backstage.io/vcf-automation-resource-origin: 'STANDALONE'
spec:
  type: CCI.Supervisor.Namespace
  domain: my-project  # References parent project
```

### CCI Supervisor Resource Component  
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-cci-resource
  annotations:
    terasky.backstage.io/vcf-automation-resource-origin: 'STANDALONE'
    terasky.backstage.io/vcf-automation-cci-resource-manifest: '{"apiVersion":"v1","kind":"ConfigMap",...}'
    terasky.backstage.io/vcf-automation-cci-resource-object: '{"apiVersion":"v1","kind":"ConfigMap",...}'
spec:
  type: CCI.Supervisor.Resource
  subcomponentOf: my-cci-namespace  # References parent namespace
```

## Links

- [Installation Guide](install.md)
- [Configuration Guide](configure.md)
