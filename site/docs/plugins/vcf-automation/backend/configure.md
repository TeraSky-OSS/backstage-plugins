# Configuring the VCF Automation Backend Plugin

This guide covers the configuration options available for the VCF Automation backend plugin.

## Configuration File

The plugin is configured through your `app-config.yaml`. Here's the basic configuration:

```yaml
vcfAutomation:
  name: my-vcf-01
  majorVersion: 9
  orgName: my-org # This is needed only in VCFA 9 and above
  organizationType: 'all-apps' # Options: 'vm-apps' (default) or 'all-apps' for VCF 9 organization types
  baseUrl: 'https://your-vcf-automation-instance'
  authentication:
    username: 'your-username'
    password: 'your-password'
```  
  
The plugin does support multi instance config in the following format:

```yaml
vcfAutomation:
  instances:
  - name: my-vcf-01
    baseUrl: 'https://your-vcf-automation-instance'
    majorVersion: 8
    authentication:
      username: 'your-username'
      password: 'your-password'
      domain: 'your-domain'
  - name: my-vcf-02
    baseUrl: 'https://your-vcf-02-automation-instance'
    majorVersion: 9
    orgName: my-org # This is needed only in VCFA 9 and above
    organizationType: 'all-apps' # Options: 'vm-apps' (default) or 'all-apps' for VCF 9 organization types
    authentication:
      username: 'your-username'
      password: 'your-password'
```


## API Endpoints

The plugin exposes the following endpoints:

- `GET /api/vcf-automation/deployments/:id` - Get deployment details
- `GET /api/vcf-automation/resources/:id` - Get resource details
- `GET /api/vcf-automation/projects/:id` - Get project details
- `GET /api/vcf-automation/projects` - Get all projects
- `GET /api/vcf-automation/deployments` - Get all deployments
- `GET /api/vcf-automation/deployments/:id/resources` - Get all resources for a deployment
- `POST /api/vcf-automation/deployments/:id/operations` - Execute deployment operations
- `GET /api/vcf-automation/events` - Stream VCF events

## Links

- [Installation Guide](install.md)
- [About the plugin](about.md)
