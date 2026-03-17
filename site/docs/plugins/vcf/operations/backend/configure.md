# Configuring VCF Operations Backend Plugin

This guide covers how to configure the VCF Operations Backend plugin for your environment.

## Basic Configuration

### Single Instance Setup

For a single VCF Operations instance, add the following to your `app-config.yaml`:

```yaml
vcfOperations:
  instances:
    - name: production-vcf
      baseUrl: 'https://vcf-ops.company.com'
      majorVersion: 9
      authentication:
        username: 'backstage-service'
        password: 'secure-password'
```

### Multiple Instance Setup

For multiple VCF Operations instances:

```yaml
vcfOperations:
  instances:
    - name: production-vcf
      baseUrl: 'https://prod-vcf.company.com'
      majorVersion: 9
      relatedVCFAInstances:
        - prod-vcfa-primary
        - prod-vcfa-secondary
      authentication:
        username: 'prod-monitor'
        password: 'prod-password'
    - name: staging-vcf
      baseUrl: 'https://staging-vcf.company.com'
      majorVersion: 8
      authentication:
        username: 'staging-monitor'
        password: 'staging-password'
        domain: 'staging.local'  # Optional domain
```

## Configuration Parameters

### Instance Configuration

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Unique identifier for the VCF Operations instance |
| `baseUrl` | string | Yes | Full URL to the VCF Operations instance |
| `majorVersion` | number | No | VCF Operations version (8 or 9). Default: 8 |
| `relatedVCFAInstances` | string[] | No* | Associated VCF Automation instances |
| `authentication` | object | Yes | Authentication credentials |

\* Required when multiple instances are configured

### Authentication Configuration

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | VCF Operations username |
| `password` | string | Yes | VCF Operations password |
| `domain` | string | No | Authentication domain (if required) |

### Advanced Configuration

#### Organization Type Support (VCF 9)

```yaml
vcfOperations:
  instances:
    - name: vcf-9-instance
      baseUrl: 'https://vcf9.company.com'
      majorVersion: 9
      authentication:
        username: 'admin'
        password: 'password'
```

## Environment-Specific Configuration

### Development Environment

```yaml
# app-config.local.yaml
vcfOperations:
  instances:
    - name: dev-vcf
      baseUrl: 'https://dev-vcf.company.com'
      majorVersion: 9
      authentication:
        username: 'dev-user'
        password: 'dev-password'
```

### Production Environment

```yaml
# app-config.production.yaml
vcfOperations:
  instances:
    - name: prod-vcf-primary
      baseUrl: 'https://vcf-prod-01.company.com'
      majorVersion: 9
      relatedVCFAInstances:
        - vcfa-prod-cluster-01
        - vcfa-prod-cluster-02
      authentication:
        username: '${VCF_OPS_USERNAME}'  # Use environment variables
        password: '${VCF_OPS_PASSWORD}'
    - name: prod-vcf-secondary
      baseUrl: 'https://vcf-prod-02.company.com'
      majorVersion: 9
      authentication:
        username: '${VCF_OPS_USERNAME}'
        password: '${VCF_OPS_PASSWORD}'
```

## Security Configuration

### Using Environment Variables

Store sensitive credentials in environment variables:

```bash
# .env
VCF_OPS_USERNAME=backstage-service
VCF_OPS_PASSWORD=super-secure-password
```

```yaml
# app-config.yaml
vcfOperations:
  instances:
    - name: production-vcf
      baseUrl: 'https://vcf-ops.company.com'
      majorVersion: 9
      authentication:
        username: '${VCF_OPS_USERNAME}'
        password: '${VCF_OPS_PASSWORD}'
```

### Using Kubernetes Secrets

For Kubernetes deployments:

```yaml
# kubernetes-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: vcf-operations-credentials
type: Opaque
data:
  username: <base64-encoded-username>
  password: <base64-encoded-password>
```

```yaml
# deployment.yaml
spec:
  containers:
    - name: backstage
      env:
        - name: VCF_OPS_USERNAME
          valueFrom:
            secretKeyRef:
              name: vcf-operations-credentials
              key: username
        - name: VCF_OPS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: vcf-operations-credentials
              key: password
```

## Validation and Testing

### Configuration Validation

The plugin validates configuration on startup. Check logs for validation errors:

```
[vcf-operations] VcfOperationsService initialized with 2 instance(s)
[vcf-operations] Instance 'production-vcf' configured for version 9
[vcf-operations] Instance 'staging-vcf' configured for version 8
```

### Testing Connectivity

Test VCF Operations connectivity:

```bash
# Health check
curl http://localhost:7007/api/vcf-operations/health

# Instance list
curl http://localhost:7007/api/vcf-operations/instances
```

The VCF Operations Backend plugin provides flexible configuration options to integrate with various VCF Operations environments while maintaining security and performance best practices.