# Educates Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-educates/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-educates) ![NPM Downloads](https://img.shields.io/npm/dy/@terasky/backstage-plugin-educates)

## Overview

The Educates frontend plugin provides a comprehensive interface for discovering and accessing educational workshops within Backstage. It enables users to browse workshops from multiple training portals, view detailed information, and manage workshop sessions, all integrated seamlessly into the Backstage interface.

## Features

### Workshop Discovery
- Browse available workshops across multiple portals
- Filter and search capabilities
- Workshop categorization and tagging
- Multi-portal support

### Workshop Details
Comprehensive workshop information:

  - Title and description
  - Difficulty level
  - Duration estimates
  - Tags and labels
  - Capacity information
  - Availability status

### Session Management
- Launch workshops in new browser tabs
- Track active workshop sessions

### User Interface
- Material design integration
- Responsive layout
- Intuitive navigation
- Consistent Backstage styling

## Components

### EducatesPage
The main page component that provides:

- Workshop catalog view
- Portal selection
- Session management interface

### Workshop Cards
Individual workshop displays showing:

- Workshop title and description
- Key metadata
- Launch options
- Status indicators

### Portal Selection
Interface for managing multiple training portals:

- Portal switching
- Portal-specific workshop lists

## Technical Details

### Integration Points
- Backstage core platform
- Educates backend plugin
- Training portal APIs
- Permission framework

### Permission Framework
Built-in support for Backstage's resource-based permission system:

- **`educates.portal.view`**: Required for viewing and accessing specific training portals
  - Resource-based permission that controls access to individual portals
  - Supports conditional access based on user roles and portal ownership

- **`educates.workshop.start`**: Required for launching workshop sessions
  - Resource-based permission that controls access to individual workshops
  - Supports fine-grained access control per workshop

### Deprecated Permissions

⚠️ **The following permissions are removed in this version:**

- `educates.workshops.view` → Use `educates.portal.view` instead
- `educates.workshop-sessions.create` → Use `educates.workshop.start` instead

### Type Definitions
Utilizes shared types from the common package:

- `Workshop`
- `WorkshopEnvironment`
- `TrainingPortalStatus`
- `WorkshopSession`

## User Experience

### Workshop Discovery
1. Navigate to the Workshops page (requires `educates.portal.view` permission)
2. Browse available workshops by portal
3. View detailed workshop information

### Workshop Launch
1. Select desired workshop
2. Review workshop details
3. Click launch button (requires `educates.workshop.start` permission)
4. Access workshop in new browser tab

### Session Management
1. View active sessions
2. Monitor session status

## Permission Requirements

To use the frontend plugin, users need appropriate permissions:

### Basic Access
- **`educates.portal.view`**: Required to view the workshops page and browse available workshops
- **`educates.workshop.start`**: Required to launch workshop sessions

### Advanced Access Control
The plugin supports resource-based permissions that can be configured for:
- Specific training portals
- Individual workshops
- Conditional access based on user roles
- Portal and workshop ownership rules

### Permission Integration
The frontend automatically handles permission checks:
- Workshop browse functionality requires portal view permissions
- Launch buttons are only enabled for workshops the user can start
- Portal switching respects portal-specific access controls
- Workshop cards display appropriate access indicators
