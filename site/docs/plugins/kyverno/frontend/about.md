# Kyverno Policy Reports Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kyverno-policy-reports/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kyverno-policy-reports)

## Overview

The Kyverno Policy Reports frontend plugin (`@terasky/backstage-plugin-kyverno-policy-reports`) enhances your Backstage instance with comprehensive visualization capabilities for Kyverno policy reports. It provides detailed insights into policy compliance, violations, and overall security posture of your Kubernetes resources, with special support for Crossplane resources.

## Features

### Policy Report Overview
- Aggregated policy compliance metrics
- Error, fail, pass, skip, and warning counts
- Cluster-wide policy status visualization
- Component-level compliance summary

### Detailed Policy Analysis
- Resource-specific policy results
- Expandable detailed views
- Policy YAML inspection capabilities
- Copy-to-clipboard functionality

### Crossplane Integration
- Support for Crossplane Claims and Composite resources
- Dedicated policy report views for Crossplane components
- Integrated compliance monitoring for cloud resources

## Components

### KyvernoPolicyReportsTable
The main component for displaying policy reports:  
- Cluster-organized policy results  
- Expandable resource details  
- Policy YAML viewer integration  
- Sorting and filtering capabilities  

### KyvernoOverviewCard
A summary card for the component overview page:  
- Quick compliance status view  
- Key metrics visualization  
- Direct access to detailed reports  

### Crossplane-Specific Components
Special components for Crossplane integration:  
- `KyvernoCrossplanePolicyReportsTable`  
- `KyvernoCrossplaneOverviewCard`  

## Technical Details

### Integration Points
- Kubernetes resources
- Kyverno policies
- Crossplane resources
- Backstage catalog entities

### Permission Framework
- Integration with Backstage permissions
- Configurable access controls
- Role-based viewing capabilities

### Available Permissions
- `kyverno.overview.view`: Access to overview data
- `kyverno.reports.view`: Access to detailed reports
- `kyverno.policy.view-yaml`: Access to policy YAML content

## Screenshots

### Policy Reports Table
![Policy Reports Overview](../../../images/kyverno-01.png)

### Detailed Resource View
![Detailed Resource View](../../../images/kyverno-02.png)

### Policy YAML Inspection
![Policy YAML View](../../../images/kyverno-03.png)

### Overview Card
![Component Overview](../../../images/kyverno-04.png)
