# Kyverno Policy Reports Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kyverno-policy-reports-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kyverno-policy-reports-backend)

## Overview

The Kyverno Policy Reports backend plugin (`@terasky/backstage-plugin-kyverno-policy-reports-backend`) provides comprehensive functionality for managing Kyverno policy reports in your Backstage instance. This includes API integration with Kubernetes clusters, policy report retrieval and processing, permission management, and MCP actions support.

## Features

### Kubernetes Integration
- Direct communication with Kubernetes API server
- Policy report retrieval and processing
- Support for both namespaced and cluster-scoped policies
- Real-time policy status monitoring

### Policy Report Management
- Comprehensive policy report retrieval
- Policy YAML manifest access
- Policy status tracking
- Support for Crossplane resources
- Event monitoring and aggregation

### Permission Management
- Integration with Backstage's permission framework
- Fine-grained access control for policy reports
- Configurable permission policies
- Role-based access control

### MCP Actions Support
- Policy report retrieval actions
- Policy details access
- Integration with Backstage's actions framework
- Programmatic access to policy data

### API Integration
- RESTful API endpoints
- Secure data access
- Permission validation middleware
- Frontend component integration
- Kubernetes API proxy support

## Technical Details

### Available Permissions

The plugin provides three main permission types:

1. **Overview Access** (`kyverno.overview.view`)
    - Access to summary policy report data
    - High-level compliance metrics
    - Component status overview

2. **Report Access** (`kyverno.reports.view`)
    - Access to detailed policy reports
    - Resource-specific compliance data
    - Policy violation details

3. **Policy YAML Access** (`kyverno.policy.view-yaml`)
    - Access to policy YAML manifests
    - Policy configuration details
    - Rule specifications

### Integration Points

- Backstage Permission Framework
- Kyverno Policy Reports Frontend
- Kubernetes API Server
- Backstage Catalog

### Security Considerations

- Role-based access control
- Permission validation
- Secure data handling
- Audit trail capabilities
