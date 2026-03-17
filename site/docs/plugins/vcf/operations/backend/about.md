# VCF Operations Backend Plugin

The VCF Operations Backend plugin provides the server-side functionality for integrating with VMware vRealize Operations (VCF Operations) APIs. It handles authentication, resource discovery, and metrics data retrieval from VCF Operations instances.

## Overview

The backend plugin acts as a secure proxy between Backstage and VCF Operations, providing:

- **API Integration**: Direct communication with VCF Operations REST APIs
- **Authentication Management**: Secure token-based authentication with automatic refresh
- **Resource Discovery**: Intelligent resource lookup and mapping capabilities
- **Metrics Processing**: Time-series data retrieval and transformation
- **Multi-Instance Support**: Management of multiple VCF Operations environments
- **Permission Integration**: Backstage permission system integration

## Key Features

### Authentication & Security
- **Token-Based Auth**: Secure vRealizeOpsToken authentication
- **Automatic Refresh**: Token refresh with 6-hour validity periods
- **Credential Management**: Secure handling of VCF Operations credentials
- **Retry Logic**: Exponential backoff for failed authentication attempts

### Resource Discovery
- **Smart Lookup**: Multiple resource discovery strategies
- **VirtualMachine Priority**: Prioritizes VM resources in searches
- **Fallback Mechanisms**: Multiple search approaches for maximum compatibility
- **Property-Based Search**: Advanced property condition filtering

### Metrics Handling
- **Time-Series Data**: Comprehensive metrics data retrieval
- **Aggregation Support**: Multiple rollup types (AVG, MIN, MAX, SUM, LATEST)
- **Interval Management**: Dynamic interval calculation based on time ranges
- **Data Transformation**: Response format normalization for frontend consumption

### API Endpoints

The backend provides the following REST endpoints:

#### Health Check
```
GET /api/vcf-operations/health
```
Returns the health status of the backend service.

#### Instance Management
```
GET /api/vcf-operations/instances
```
Returns list of configured VCF Operations instances.

#### Resource Discovery
```
GET /api/vcf-operations/resources/find-by-name?resourceName={name}&instance={instance}
```
Find resources by name with VirtualMachine prioritization.

```
GET /api/vcf-operations/resources/find-by-property?propertyKey={key}&propertyValue={value}&instance={instance}
```
Find resources by property conditions.

```
POST /api/vcf-operations/resources/query?instance={instance}
```
Advanced resource search with complex query conditions.

#### Metrics Retrieval
```
GET /api/vcf-operations/resources/{resourceId}/metrics?statKeys={keys}&begin={timestamp}&end={timestamp}&rollUpType={type}&instance={instance}
```
Get time-series metrics data for a specific resource.

```
GET /api/vcf-operations/resources/{resourceId}/available-metrics?instance={instance}
```
Get list of available metrics for a resource.

```
GET /api/vcf-operations/metrics/latest?resourceIds={ids}&statKeys={keys}&instance={instance}
```
Get latest metric values for multiple resources.

The VCF Operations Backend plugin provides a robust, secure, and scalable foundation for integrating VCF Operations data into your Backstage environment.