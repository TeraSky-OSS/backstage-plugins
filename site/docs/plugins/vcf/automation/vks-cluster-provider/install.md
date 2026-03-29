# Installing the VCFA VKS Cluster Provider Plugin

This guide will help you install and set up the VCFA VKS cluster provider plugin.

## Prerequisites

1. A working Backstage instance
2. The Backstage Kubernetes plugin installed and configured
3. Access to a VCF Automation (VCFA) instance running version 9.x (`all-apps` organization type)
4. VCFA user credentials with sufficient permissions to read supervisor resources and proxy API access

> **Important:** Backstage currently supports only one custom cluster supplier at a time. If you are also using the [SpectroCloud Cluster Provider](../../../spectrocloud/cluster-provider/about.md), only one of the two plugins can be enabled in your Backstage instance at a time.

## Installation Steps

### 1. Add Required Package

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-vcfa-vks-cluster-provider
```

### 2. Add to Backend

Modify `packages/backend/src/index.ts`:

```typescript
backend.add(import('@terasky/backstage-plugin-vcfa-vks-cluster-provider'));
```

### 3. Configure VCFA

Add to your `app-config.yaml`:

```yaml
vcfaVks:
  instances:
    - baseUrl: https://vcfa.example.com
      orgName: vcfa
      authentication:
        username: ${VCFA_USERNAME}
        password: ${VCFA_PASSWORD}
```

## Verification

After installation:

1. Check backend logs for cluster discovery messages
2. Navigate to a component with Kubernetes resources
3. Verify VCFA VKS clusters appear in the Kubernetes tab

### Testing

Look for log messages like:

```
Found X VKS cluster(s) in VCFA
VKS cluster refresh complete: X/X cluster(s) configured
✓ my-cluster (Service Account)
```

## Troubleshooting

### Common Issues

1. **No Clusters Found**
   - Verify VCFA credentials and `orgName`
   - Ensure the VCFA user has access to supervisor resources and the proxy API
   - Check that supervisor namespaces exist and have VKS clusters deployed
   - Review backend logs for authentication errors

2. **Kubeconfig Fetch Failures**
   - Verify the VCFA user has proxy API read access
   - Check that the kubeconfig secret (`{clusterName}-kubeconfig`) exists in the supervisor namespace
   - Review backend logs for HTTP status errors

3. **RBAC Setup Failures**
   - Verify the kubeconfig obtained from VCFA grants admin access to the VKS cluster
   - Check cluster network connectivity from the Backstage backend
   - Review backend logs for Kubernetes API errors

## Next Steps

1. Configure [advanced options](./configure.md) such as custom RBAC rules
2. Set up [multiple VCFA instances](./configure.md#multi-instance)
3. Adjust the [refresh interval](./configure.md#cluster-provider-settings) to match your needs
