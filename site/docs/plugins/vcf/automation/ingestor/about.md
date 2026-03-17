# VCF Automation Ingestor Plugin

## Overview

The VCF Automation Ingestor plugin ingests VCF Automation deployments into the Backstage catalog. It automatically creates and maintains various entity types based on VCF Automation resources.

## Features

### Systems Integration
- Creates system entities from VCF Automation deployments
- Maintains deployment metadata and relationships
- Tracks deployment ownership and domain information

### Component Management
- Creates component entities from VSphere Machine resources
- Maintains VM configurations and relationships
- Tracks system dependencies

### Resource Processing
- Creates resource entities from VCF Automation resources
- Maintains resource metadata and relationships
- Tracks dependencies between resources

### Domain Integration
- Creates domain entities from VCF Automation projects
- Maintains project ownership information
- Manages project relationships

### Authentication
- Bearer token authentication with VCF Automation API
- Automatic token refresh handling
- Secure credential management

## Entity Types

### Systems
Systems are created from VCF Automation deployments with the following properties:  
- `name`: The deployment ID  
- `owner`: The deployment owner in the format `{ownerType}:{ownedBy}`  
- `domain`: The project ID  

### Components
Components are created from VCF Automation resources of type `Cloud.vSphere.Machine` with:  
- `title`: The resource name  
- `name`: The resource ID  
- `type`: The resource type (`Cloud.vSphere.Machine`)  
- `owner`: The deployment owner  
- `system`: The parent deployment  
- `lifecycle`: Set to 'production'  
- `dependsOn`: List of dependent resources  

### Resources
Resources are created from all other VCF Automation resource types with:  
- `title`: The resource name  
- `name`: The resource ID  
- `type`: The resource type  
- `owner`: The deployment owner  
- `system`: The parent deployment ID  
- `dependsOn`: List of dependent resource IDs  

### Domains
Domains are created from VCF Automation projects with:  
- `name`: The project ID  
- `owner`: The project owner  

## Links

- [Installation Guide](install.md)
- [Configuration Guide](configure.md)
