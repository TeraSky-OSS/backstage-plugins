import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import fetch, { RequestInit } from 'node-fetch';

interface VcfAuthResponse {
  cspAuthToken: string;
}

interface VcfErrorResponse {
  error: string;
  status: 'error';
}

interface VcfInstance {
  baseUrl: string;
  name: string;
  majorVersion: number;
  authentication: {
    username: string;
    password: string;
    domain: string;
  };
  orgName?: string;
  organizationType?: 'vm-apps' | 'all-apps';
  token?: string;
  tokenExpiry?: Date;
}

export class VcfAutomationService {
  private readonly instances: VcfInstance[];
  private readonly defaultInstance: VcfInstance;

  constructor(config: Config, private readonly logger: LoggerService) {
    // Get instances configuration
    let instances: VcfInstance[] = [];
    
    try {
      // First try to get instances array
      const instancesConfig = config.getOptionalConfigArray('vcfAutomation.instances');
      
      if (instancesConfig && instancesConfig.length > 0) {
        // Multi-instance configuration
        instances = instancesConfig.map(instanceConfig => {
          const baseUrl = instanceConfig.getString('baseUrl');
          return {
            baseUrl,
            name: instanceConfig.getOptionalString('name') ?? new URL(baseUrl).hostname,
            majorVersion: instanceConfig.getOptionalNumber('majorVersion') ?? 8,
            authentication: {
              username: instanceConfig.getString('authentication.username'),
              password: instanceConfig.getString('authentication.password'),
              domain: instanceConfig.getOptionalString('authentication.domain') ?? "",
            },
            orgName: instanceConfig.getOptionalString('orgName'),
            organizationType: instanceConfig.getOptionalString('organizationType') as 'vm-apps' | 'all-apps' ?? 'vm-apps',
          };
        });
      } else {
        // Legacy single instance configuration
        const baseUrl = config.getString('vcfAutomation.baseUrl');
        const auth = config.getConfig('vcfAutomation.authentication');
        instances = [{
          baseUrl,
          name: config.getOptionalString('vcfAutomation.name') ?? new URL(baseUrl).hostname,
          majorVersion: config.getOptionalNumber('vcfAutomation.majorVersion') ?? 8,
          authentication: {
            username: auth.getString('username'),
            password: auth.getString('password'),
            domain: auth.getString('domain'),
          },
          orgName: config.getOptionalString('vcfAutomation.orgName'),
          organizationType: config.getOptionalString('vcfAutomation.organizationType') as 'vm-apps' | 'all-apps' ?? 'vm-apps',
        }];
      }
    } catch (error) {
      this.logger.error('Failed to read VCF Automation configuration', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to initialize VCF Automation service: Invalid configuration');
    }

    if (instances.length === 0) {
      throw new Error('No VCF Automation instances configured');
    }

    this.instances = instances;
    this.defaultInstance = instances[0];
    this.logger.info(`VcfAutomationService initialized with ${instances.length} instance(s)`);
  }

  private async authenticate(instance: VcfInstance, retries = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (instance.token && instance.tokenExpiry && instance.tokenExpiry > new Date()) {
          this.logger.debug(`Using existing valid token for instance ${instance.name}`);
          return;
        }

        this.logger.debug(`Authentication attempt ${attempt} of ${retries} for instance ${instance.name} (version ${instance.majorVersion})`);
        
        if (instance.majorVersion >= 9) {
          // Version 9+ authentication using vCloud Director API
          const username = instance.orgName 
            ? `${instance.authentication.username}@${instance.orgName}`
            : instance.authentication.username;
          
          const basicAuth = Buffer.from(`${username}:${instance.authentication.password}`).toString('base64');
          
          const response = await fetch(`${instance.baseUrl}/cloudapi/1.0.0/sessions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json;version=40.0',
              'Authorization': `Basic ${basicAuth}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Authentication failed with status ${response.status}: ${response.statusText}`);
          }

          const accessToken = response.headers.get('x-vmware-vcloud-access-token');
          if (!accessToken) {
            throw new Error(`No access token received from VCF Automation instance ${instance.name}`);
          }

          instance.token = accessToken;
          // Version 9+ tokens expire after 1 hour
          instance.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
          this.logger.debug(`Successfully authenticated with VCF Automation instance ${instance.name} (version 9+)`);
          return;
        } 
          // Version 8 authentication using CSP API
          const response = await fetch(`${instance.baseUrl}/csp/gateway/am/api/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(instance.authentication),
          });

          if (!response.ok) {
            throw new Error(`Authentication failed with status ${response.status}: ${response.statusText}`);
          }

          const data = (await response.json()) as VcfAuthResponse;
          instance.token = data.cspAuthToken;
          // Version 8 tokens expire after 24 hours
          instance.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
          this.logger.debug(`Successfully authenticated with VCF Automation instance ${instance.name} (version 8)`);
          return;
        
      } catch (error) {
        this.logger.warn(`Authentication attempt ${attempt} failed for instance ${instance.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        
        if (attempt === retries) {
          this.logger.error(`All authentication attempts failed for instance ${instance.name}`);
          throw new Error(`Failed to authenticate with VCF Automation instance ${instance.name} after multiple attempts`);
        }
        
        // Wait before retrying (with exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  private async makeAuthorizedRequest(path: string, instanceName?: string, options?: RequestInit): Promise<any> {
    const instance = instanceName 
      ? this.instances.find(i => i.name === instanceName) ?? this.defaultInstance
      : this.defaultInstance;

    try {
      await this.authenticate(instance);
      // Prepare request options
      const requestOptions: RequestInit = {
        method: 'GET',
        ...options,
        headers: {
          Authorization: `Bearer ${instance.token}`,
          ...(options?.headers as Record<string, string> || {}),
        },
      };

      const response = await fetch(`${instance.baseUrl}${path}`, requestOptions);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      this.logger.error(`Failed to make authorized request to ${path} on instance ${instance.name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`VCF Automation service unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getDeploymentHistory(deploymentId: string, instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      return await this.makeAuthorizedRequest(`/deployment/api/deployments/${deploymentId}/requests`, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get deployment history for ${deploymentId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }
  
  async getDeploymentDetails(deploymentId: string, instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      return await this.makeAuthorizedRequest(`/deployment/api/deployments/${deploymentId}`, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get deployment details for ${deploymentId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async getDeploymentEvents(deploymentId: string, instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      return await this.makeAuthorizedRequest(`/deployment/api/deployments/${deploymentId}/userEvents`, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get deployment events for ${deploymentId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async getResourceDetails(deploymentId: string, resourceId: string, instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      return await this.makeAuthorizedRequest(`/deployment/api/deployments/${deploymentId}/resources/${resourceId}`, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get resource details for deployment ${deploymentId}, resource ${resourceId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async getProjectDetails(projectId: string, instanceName?: string): Promise<any | VcfErrorResponse> {
    const instance = instanceName 
      ? this.instances.find(i => i.name === instanceName) ?? this.defaultInstance
      : this.defaultInstance;

    try {
      // Use different API endpoints based on organization type
      const apiPath = instance.organizationType === 'all-apps' 
        ? `/project-service/api/projects/${projectId}`
        : `/iaas/api/projects/${projectId}`;
      
      return await this.makeAuthorizedRequest(apiPath, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get project details for ${projectId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async getProjects(instanceName?: string): Promise<any | VcfErrorResponse> {
    const instance = instanceName 
      ? this.instances.find(i => i.name === instanceName) ?? this.defaultInstance
      : this.defaultInstance;

    try {
      // Use different API endpoints based on organization type
      const apiPath = instance.organizationType === 'all-apps' 
        ? `/project-service/api/projects`
        : `/iaas/api/projects`;
      
      return await this.makeAuthorizedRequest(apiPath, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get projects list`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async getDeployments(instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      // Deployment API endpoint is the same for both organization types
      return await this.makeAuthorizedRequest(`/deployment/api/deployments`, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get deployments list`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async getDeploymentResources(deploymentId: string, instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      // Resources API endpoint is the same for both organization types
      return await this.makeAuthorizedRequest(`/deployment/api/deployments/${deploymentId}/resources`, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get resources for deployment ${deploymentId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async getSupervisorResources(instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      // This endpoint is only available for all-apps organization types
      return await this.makeAuthorizedRequest(`/deployment/api/supervisor-resources`, instanceName);
    } catch (error) {
      this.logger.error('Failed to get supervisor resources', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async getSupervisorResource(resourceId: string, instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      // This endpoint is only available for all-apps organization types
      return await this.makeAuthorizedRequest(`/deployment/api/supervisor-resources/${resourceId}`, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get supervisor resource ${resourceId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async getSupervisorNamespaces(instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      // This endpoint is only available for all-apps organization types
      return await this.makeAuthorizedRequest(`/cci/kubernetes/apis/infrastructure.cci.vmware.com/v1alpha2/supervisornamespaces?limit=500`, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get supervisor namespaces`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async getSupervisorNamespace(namespaceId: string, instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      // This endpoint is only available for all-apps organization types
      return await this.makeAuthorizedRequest(`/cci/kubernetes/apis/infrastructure.cci.vmware.com/v1alpha2/supervisornamespaces/${namespaceId}`, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get supervisor namespace ${namespaceId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  // VM Power Management for deployment-managed VMs
  async checkVmPowerAction(resourceId: string, action: 'PowerOn' | 'PowerOff', instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      const actionId = `CCI.Supervisor.Resource.VirtualMachine.${action}`;
      return await this.makeAuthorizedRequest(`/deployment/api/resources/${resourceId}/actions/${actionId}?apiVersion=2020-08-25`, instanceName);
    } catch (error) {
      this.logger.error(`Failed to check VM power action ${action} for resource ${resourceId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async executeVmPowerAction(resourceId: string, action: 'PowerOn' | 'PowerOff', instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      const actionId = `CCI.Supervisor.Resource.VirtualMachine.${action}`;
      const body = { actionId };
      
      return await this.makeAuthorizedRequest(
        `/deployment/api/resources/${resourceId}/requests?apiVersion=2020-08-25`,
        instanceName,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
    } catch (error) {
      this.logger.error(`Failed to execute VM power action ${action} for resource ${resourceId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  // VM Power Management for standalone VMs
  async getStandaloneVmStatus(namespaceUrnId: string, namespaceName: string, vmName: string, instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      const apiPath = `/proxy/k8s/namespaces/${namespaceUrnId}/apis/vmoperator.vmware.com/v1alpha3/namespaces/${namespaceName}/virtualmachines/${vmName}`;
      this.logger.info(`Fetching standalone VM status for ${vmName}`, {
        namespaceUrnId,
        namespaceName,
        vmName,
        apiPath,
        instanceName,
      });
      return await this.makeAuthorizedRequest(apiPath, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get standalone VM status for ${vmName} in namespace ${namespaceName}`, {
        namespaceUrnId,
        namespaceName,
        vmName,
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async executeStandaloneVmPowerAction(namespaceUrnId: string, namespaceName: string, vmName: string, powerState: 'PoweredOn' | 'PoweredOff', vmData: any, instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      // Update the power state in the VM data
      const updatedVmData = {
        ...vmData,
        spec: {
          ...vmData.spec,
          powerState,
        },
      };

      return await this.makeAuthorizedRequest(
        `/proxy/k8s/namespaces/${namespaceUrnId}/apis/vmoperator.vmware.com/v1alpha3/namespaces/${namespaceName}/virtualmachines/${vmName}`,
        instanceName,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedVmData),
        }
      );
    } catch (error) {
      this.logger.error(`Failed to execute standalone VM power action for ${vmName} in namespace ${namespaceName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  // Helper method to construct Kubernetes API path from resource details
  private constructK8sApiPath(namespaceUrnId: string, namespaceName: string, resourceName: string, apiVersion: string, kind: string): string {
    // Parse the apiVersion to extract group and version
    const [group, version] = apiVersion.includes('/') ? apiVersion.split('/') : ['', apiVersion];
    
    // Convert kind to the plural resource name (this is a simple conversion, might need refinement)
    const resourceType = this.kindToResourceType(kind);
    
    if (group) {
      return `/proxy/k8s/namespaces/${namespaceUrnId}/apis/${group}/${version}/namespaces/${namespaceName}/${resourceType}/${resourceName}`;
    } 
      // Core API resources (like pods, services, etc.)
      return `/proxy/k8s/namespaces/${namespaceUrnId}/api/${version}/namespaces/${namespaceName}/${resourceType}/${resourceName}`;
    
  }

  // Helper method to convert Kind to resource type (plural form used in API paths)
  private kindToResourceType(kind: string): string {
    const kindToResourceMap: { [key: string]: string } = {
      'VirtualMachine': 'virtualmachines',
      'TanzuKubernetesCluster': 'tanzukubernetesclusters',
      'Cluster': 'clusters',
      'Pod': 'pods',
      'Service': 'services',
      'Deployment': 'deployments',
      'ConfigMap': 'configmaps',
      'Secret': 'secrets',
      'Namespace': 'namespaces',
      // Add more mappings as needed
    };

    // If we have a direct mapping, use it
    if (kindToResourceMap[kind]) {
      return kindToResourceMap[kind];
    }

    // Otherwise, convert to lowercase and add 's' (basic pluralization)
    // This is a fallback and may not work for all resource types
    return `${kind.toLowerCase()  }s`;
  }

  // Supervisor Resource Manifest Management
  async getSupervisorResourceManifest(namespaceUrnId: string, namespaceName: string, resourceName: string, apiVersion: string, kind: string, instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      const apiPath = this.constructK8sApiPath(namespaceUrnId, namespaceName, resourceName, apiVersion, kind);
      this.logger.info(`Fetching supervisor resource manifest for ${resourceName}`, {
        namespaceUrnId,
        namespaceName,
        resourceName,
        apiVersion,
        kind,
        apiPath,
        instanceName,
      });
      return await this.makeAuthorizedRequest(apiPath, instanceName);
    } catch (error) {
      this.logger.error(`Failed to get supervisor resource manifest for ${resourceName} in namespace ${namespaceName}`, {
        namespaceUrnId,
        namespaceName,
        resourceName,
        apiVersion,
        kind,
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }

  async updateSupervisorResourceManifest(namespaceUrnId: string, namespaceName: string, resourceName: string, apiVersion: string, kind: string, manifest: any, instanceName?: string): Promise<any | VcfErrorResponse> {
    try {
      const apiPath = this.constructK8sApiPath(namespaceUrnId, namespaceName, resourceName, apiVersion, kind);
      this.logger.info(`Updating supervisor resource manifest for ${resourceName}`, {
        namespaceUrnId,
        namespaceName,
        resourceName,
        apiVersion,
        kind,
        apiPath,
        instanceName,
      });

      return await this.makeAuthorizedRequest(
        apiPath,
        instanceName,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(manifest),
        }
      );
    } catch (error) {
      this.logger.error(`Failed to update supervisor resource manifest for ${resourceName} in namespace ${namespaceName}`, {
        namespaceUrnId,
        namespaceName,
        resourceName,
        apiVersion,
        kind,
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: 'Service temporarily unavailable', status: 'error' };
    }
  }
} 