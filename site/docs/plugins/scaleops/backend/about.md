# ScaleOps Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-scaleops-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-scaleops-backend)

## Overview

The ScaleOps backend plugin provides server-side functionality for integrating ScaleOps cost optimization data into your Backstage instance. It handles authentication, API proxying, and exposes Model Context Protocol (MCP) actions for AI agents and automation tools.

## Features

### API Integration
- Secure server-side authentication with ScaleOps
- Token caching for optimal performance
- Support for Internal and LDAP authentication
- API request proxying for frontend plugin
- Multi-cluster support

### MCP Actions
The plugin exposes 5 entity-centric MCP actions:

- **get_scaleops_data_for_entity** - Get workload data for a Backstage component
- **get_scaleops_cost_analysis_for_entity** - Get detailed cost analysis over time (7d, 30d, 90d)
- **get_scaleops_recommendations_for_entity** - Get prioritized optimization recommendations
- **get_scaleops_network_usage_for_entity** - Get network usage and cost data
- **get_scaleops_policy_definitions_for_entity** - Get ScaleOps policy definitions

All MCP actions work with Backstage catalog entities that have the `backstage.io/kubernetes-label-selector` annotation.

### Security Features
- Server-side authentication (no exposed credentials in frontend)
- Secure token caching with automatic refresh
- Request authentication middleware

## Technical Architecture

### Integration Points
- ScaleOps Frontend Plugin
- Backstage Auth System
- Backstage Catalog API
- MCP Actions Registry

### Authentication Flow
1. Backend reads credentials from configuration
2. Authenticates with ScaleOps using POST to `/auth/callback`
3. Extracts and caches token with expiration tracking
4. Automatically refreshes on expiration

### API Proxy Flow
Frontend makes requests to `/api/scaleops/api/*` → Backend authenticates → Proxies to ScaleOps → Returns response

## Use Cases

### AI Agent Integration
- Answer questions about component costs
- Provide optimization recommendations
- Generate cost reports per service/team
- Monitor under-provisioned components

### Automation
- Generate periodic cost reports
- Alert on high-priority issues
- Track optimization over time
- Integrate with external systems (Slack, PagerDuty)

### Developer Experience
- Eliminates frontend CORS issues
- Provides secure authentication
- Offers fast, cached responses
- Enables AI-powered cost insights
