# Configuring the ScaleOps Backend Plugin

The ScaleOps backend plugin requires configuration for authentication and optional features like dashboard URL generation.

## Basic Configuration

Add the following to your `app-config.yaml`:

```yaml
scaleops:
  baseUrl: https://your-scaleops-instance.com
  authentication:
    enabled: true
    type: internal  # or 'ldap'
    user: ${SCALEOPS_USER}
    password: ${SCALEOPS_PASSWORD}
```

## Configuration Options

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `baseUrl` | string | The URL of your ScaleOps instance |

### Authentication Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `authentication.enabled` | boolean | `false` | Whether authentication is enabled |
| `authentication.type` | string | `internal` | Authentication type: `internal` or `ldap` |
| `authentication.user` | string | - | Username for ScaleOps authentication |
| `authentication.password` | string | - | Password for ScaleOps authentication |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `linkToDashboard` | boolean | `false` | Whether to generate dashboard URLs in MCP action outputs |

## Configuration Examples

### Internal Authentication

```yaml
scaleops:
  baseUrl: https://scaleops.example.com
  authentication:
    enabled: true
    type: internal
    user: ${SCALEOPS_USER}
    password: ${SCALEOPS_PASSWORD}
```

### LDAP Authentication

```yaml
scaleops:
  baseUrl: https://scaleops.example.com
  authentication:
    enabled: true
    type: ldap
    user: ${SCALEOPS_LDAP_USER}
    password: ${SCALEOPS_LDAP_PASSWORD}
```

### With Dashboard Links Enabled

```yaml
scaleops:
  baseUrl: https://scaleops.example.com
  linkToDashboard: true  # Enable dashboard URLs in MCP actions
  authentication:
    enabled: true
    type: internal
    user: ${SCALEOPS_USER}
    password: ${SCALEOPS_PASSWORD}
```

### No Authentication (Development Only)

```yaml
scaleops:
  baseUrl: https://scaleops.internal.dev
```

## Environment Variables

### Using Environment Variables

Store credentials as environment variables for security:

```bash
# .env file (DO NOT commit to git)
SCALEOPS_USER=your-username
SCALEOPS_PASSWORD=your-secure-password
```

### Docker Environment

```bash
docker run \
  -e SCALEOPS_USER=your-username \
  -e SCALEOPS_PASSWORD=your-password \
  your-backstage-image
```

### Kubernetes Secrets

Create a Kubernetes secret:

```bash
kubectl create secret generic scaleops-credentials \
  --from-literal=username=your-username \
  --from-literal=password=your-password \
  -n backstage
```

Reference in deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backstage-backend
spec:
  template:
    spec:
      containers:
        - name: backend
          env:
            - name: SCALEOPS_USER
              valueFrom:
                secretKeyRef:
                  name: scaleops-credentials
                  key: username
            - name: SCALEOPS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: scaleops-credentials
                  key: password
```

## Multi-Environment Configuration

### Development Environment

`app-config.local.yaml`:
```yaml
scaleops:
  baseUrl: https://scaleops-dev.company.com
  linkToDashboard: true
  authentication:
    enabled: true
    type: internal
    user: dev-user
    password: dev-password
```

### Production Environment

`app-config.production.yaml`:
```yaml
scaleops:
  baseUrl: https://scaleops.company.com
  linkToDashboard: true
  authentication:
    enabled: true
    type: ldap
    user: ${SCALEOPS_USER}
    password: ${SCALEOPS_PASSWORD}
```

## MCP Actions

MCP actions are automatically enabled when the plugin is installed. No additional configuration is required.

### Dashboard URL Generation

If `linkToDashboard: true`, all MCP action outputs will include dashboard URLs:

```json
{
  "workloads": [
    {
      "workloadName": "my-app",
      "dashboardUrl": "https://scaleops.example.com/cost-report/compute?searchTerms=my-app&..."
    }
  ]
}
```

If `linkToDashboard: false` or omitted, `dashboardUrl` will be `null`.

## Best Practices

### Security

1. **Credential Management**
    - Never commit credentials to git
    - Use environment variables or secrets
    - Rotate credentials regularly

2. **Authentication**
    - Use LDAP for production environments
    - Create dedicated service accounts
    - Use HTTPS for `baseUrl`

3. **Access Control**
    - Limit ScaleOps user permissions to read-only
    - Use dedicated credentials per environment
    - Monitor access logs
