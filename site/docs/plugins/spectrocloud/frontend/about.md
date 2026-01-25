# SpectroCloud Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud)

## Overview

The SpectroCloud Frontend plugin provides entity cards for visualizing SpectroCloud clusters and cluster profiles within Backstage. It integrates with the SpectroCloud backend plugin to display real-time data and provides interactive features like kubeconfig downloads and pack/layer exploration.

## Features

### Cluster Card
- **Basic Information**:
  - Cluster name and state
  - Kubernetes version
  - Cloud type (AWS, Azure, GCP, vSphere, etc.)
  - Scope (project or tenant)
  - Project name (if project-scoped)

- **Attached Profiles**:
  - Expandable profile list
  - Profile version display
  - Upgrade availability indicators
  - Pack/layer details with YAML viewer

- **Kubeconfig Download**:
  - One-click kubeconfig download
  - FRP (reverse proxy) support
  - Permission-controlled access

### Profile Card
- **Profile Information**:
  - Profile type (infra, addon, full)
  - Cloud type
  - Scope
  - Latest version

- **Version Management**:
  - All available versions listed
  - Cluster count per version
  - Expandable cluster lists
  - Direct links to cluster entities

### Pack/Layer Viewer
- **Configuration Display**:
  - Syntax-highlighted YAML viewer
  - Values configuration
  - Manifest content (for manifest packs)
  - Tab-based navigation

## Technical Architecture

### Entity Cards
The plugin provides two main entity cards:
- `SpectroCloudClusterCard`: For `spectrocloud-cluster` resource entities
- `SpectroCloudClusterProfileCard`: For `spectrocloud-cluster-profile` resource entities

### Data Flow
1. Cards read basic entity information from annotations
2. Detailed data is fetched from the backend API
3. Real-time refresh available via refresh button
4. Permission checks control feature visibility

### Permission Integration
The frontend respects permission decisions from the backend:
- Kubeconfig download button controlled by `download-kubeconfig` permission
- Pack values viewing controlled by `view-pack-values` permission
- Pack manifests viewing controlled by `view-pack-manifests` permission

## Use Cases

### Cluster Management
- View cluster health and status at a glance
- Access kubeconfig for cluster operations
- Monitor profile versions and available upgrades

### Profile Tracking
- Track which clusters use which profile versions
- Plan profile upgrades across clusters
- Understand profile adoption

### Configuration Review
- Review pack configurations without accessing Palette
- Compare values across profiles
- Audit manifest content

