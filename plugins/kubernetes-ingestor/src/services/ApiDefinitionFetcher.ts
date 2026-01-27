import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { DefaultKubernetesResourceFetcher } from './KubernetesResourceFetcher';
import { ApiFromResourceRef, ApiDefinitionResult } from '../types';
import yaml from 'js-yaml';
import fetch from 'node-fetch';
import pluralize from 'pluralize';

/**
 * Service for fetching API definitions from URLs or Kubernetes resource references.
 * Supports two annotation types:
 * 1. provides-api-from-url: Direct URL to the API definition
 * 2. provides-api-from-resource-ref: Reference to a Kubernetes resource that exposes the API
 */
export class ApiDefinitionFetcher {
  constructor(
    private readonly resourceFetcher: DefaultKubernetesResourceFetcher,
    private readonly config: Config,
    private readonly logger: LoggerService,
  ) {}

  private getAnnotationPrefix(): string {
    return this.config.getOptionalString('kubernetesIngestor.annotationPrefix') || 'terasky.backstage.io';
  }

  /**
   * Fetches an API definition from a direct URL.
   * @param url The URL to fetch the API definition from
   * @returns The API definition result
   */
  async fetchFromUrl(url: string): Promise<ApiDefinitionResult> {
    try {
      this.logger.debug(`Fetching API definition from URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json, application/yaml, text/yaml, */*',
        },
        timeout: 30000, // 30 second timeout
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch API definition from ${url}: ${response.status} ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      // Convert to YAML if it's JSON
      let yamlDefinition: string;
      if (contentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          const jsonContent = JSON.parse(text);
          yamlDefinition = yaml.dump(jsonContent);
        } catch (parseError) {
          // If JSON parsing fails, try treating it as YAML
          yamlDefinition = text;
        }
      } else {
        // Already YAML or treat as YAML
        yamlDefinition = text;
      }

      // Validate that it's valid YAML
      try {
        yaml.load(yamlDefinition);
      } catch (yamlError) {
        return {
          success: false,
          error: `Invalid API definition format from ${url}: ${yamlError}`,
        };
      }

      return {
        success: true,
        definition: yamlDefinition,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error fetching API definition from ${url}: ${error}`,
      };
    }
  }

  /**
   * Extracts a value from an object using a JSONPath-like expression.
   * Supports simple paths like ".status.loadBalancer.ingress[0].ip"
   * @param obj The object to extract the value from
   * @param path The JSONPath-like expression
   * @returns The extracted value or undefined
   */
  private extractValueFromPath(obj: any, path: string): string | undefined {
    if (!path || !obj) {
      return undefined;
    }

    // Remove leading dot if present
    const cleanPath = path.startsWith('.') ? path.substring(1) : path;
    
    // Split the path into segments, handling array notation
    const segments: string[] = [];
    let current = '';
    let inBracket = false;
    
    for (let i = 0; i < cleanPath.length; i++) {
      const char = cleanPath[i];
      if (char === '[') {
        if (current) {
          segments.push(current);
          current = '';
        }
        inBracket = true;
      } else if (char === ']') {
        if (current) {
          segments.push(`[${current}]`);
          current = '';
        }
        inBracket = false;
      } else if (char === '.' && !inBracket) {
        if (current) {
          segments.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current) {
      segments.push(current);
    }

    // Navigate through the object
    let value: any = obj;
    for (const segment of segments) {
      if (value === undefined || value === null) {
        return undefined;
      }

      // Check if it's an array index
      const arrayMatch = segment.match(/^\[(\d+)\]$/);
      if (arrayMatch) {
        const index = parseInt(arrayMatch[1], 10);
        if (Array.isArray(value) && index < value.length) {
          value = value[index];
        } else {
          return undefined;
        }
      } else {
        value = value[segment];
      }
    }

    // Return undefined if value was not found, otherwise convert to string
    if (value === undefined || value === null) {
      return undefined;
    }
    return typeof value === 'string' ? value : String(value);
  }

  /**
   * Fetches an API definition from a Kubernetes resource reference.
   * @param resourceRef The resource reference configuration
   * @param clusterName The cluster to fetch the resource from
   * @param defaultNamespace The default namespace if not specified in resourceRef
   * @returns The API definition result
   */
  async fetchFromResourceRef(
    resourceRef: ApiFromResourceRef,
    clusterName: string,
    defaultNamespace: string,
  ): Promise<ApiDefinitionResult> {
    try {
      const namespace = resourceRef.namespace || defaultNamespace;
      
      this.logger.debug(
        `Fetching API definition from resource ref: ${resourceRef.kind}/${resourceRef.name} in namespace ${namespace} on cluster ${clusterName}`,
      );

      // Parse the apiVersion to get group and version
      const apiVersionParts = resourceRef.apiVersion.split('/');
      let group: string;
      let version: string;
      
      if (apiVersionParts.length === 1) {
        // Core API (e.g., "v1")
        group = '';
        version = apiVersionParts[0];
      } else {
        // API group (e.g., "networking.k8s.io/v1")
        group = apiVersionParts[0];
        version = apiVersionParts[1];
      }

      // Build the full resource path with the correct API prefix
      // Core API uses /api/v1/..., API groups use /apis/{group}/{version}/...
      const kindPlural = pluralize(resourceRef.kind.toLowerCase());
      let resourcePath: string;
      
      if (group === '') {
        // Core API (e.g., Services, Pods, ConfigMaps)
        // Path format: /api/v1/namespaces/{namespace}/{resource}/{name}
        resourcePath = `/api/${version}/namespaces/${namespace}/${kindPlural}/${resourceRef.name}`;
      } else {
        // API group (e.g., Deployments, Ingresses)
        // Path format: /apis/{group}/{version}/namespaces/{namespace}/{resource}/{name}
        resourcePath = `/apis/${group}/${version}/namespaces/${namespace}/${kindPlural}/${resourceRef.name}`;
      }

      this.logger.debug(`Constructed Kubernetes resource path: ${resourcePath}`);

      // Fetch the resource using proxyKubernetesRequest for full path control
      let resource: any;
      try {
        resource = await this.resourceFetcher.proxyKubernetesRequest(clusterName, {
          path: resourcePath,
        });
      } catch (fetchError) {
        return {
          success: false,
          error: `Failed to fetch Kubernetes resource ${resourceRef.kind}/${resourceRef.name}: ${fetchError}`,
        };
      }

      // Extract the endpoint from the target-field
      const endpoint = this.extractValueFromPath(resource, resourceRef['target-field']);
      
      if (!endpoint) {
        return {
          success: false,
          error: `Could not extract endpoint from field "${resourceRef['target-field']}" in resource ${resourceRef.kind}/${resourceRef.name}`,
        };
      }

      // Construct the URL
      const url = `${resourceRef['target-protocol']}://${endpoint}:${resourceRef['target-port']}${resourceRef.path}`;
      
      this.logger.debug(`Constructed API definition URL from resource ref: ${url}`);

      // Fetch the API definition from the constructed URL
      return this.fetchFromUrl(url);
    } catch (error) {
      return {
        success: false,
        error: `Error processing resource ref for API definition: ${error}`,
      };
    }
  }

  /**
   * Parses the provides-api-from-resource-ref annotation value.
   * @param annotationValue The annotation value (JSON string)
   * @returns The parsed resource reference or null if invalid
   */
  parseResourceRefAnnotation(annotationValue: string): ApiFromResourceRef | null {
    try {
      const parsed = JSON.parse(annotationValue);
      
      // Validate required fields
      const requiredFields = ['kind', 'name', 'apiVersion', 'path', 'target-protocol', 'target-port', 'target-field'];
      for (const field of requiredFields) {
        if (!parsed[field]) {
          this.logger.warn(`Missing required field "${field}" in provides-api-from-resource-ref annotation`);
          return null;
        }
      }

      // Validate target-protocol
      if (parsed['target-protocol'] !== 'http' && parsed['target-protocol'] !== 'https') {
        this.logger.warn(`Invalid target-protocol "${parsed['target-protocol']}" in provides-api-from-resource-ref annotation. Must be "http" or "https"`);
        return null;
      }

      return parsed as ApiFromResourceRef;
    } catch (error) {
      this.logger.warn(`Failed to parse provides-api-from-resource-ref annotation: ${error}`);
      return null;
    }
  }

  /**
   * Fetches API definition based on resource annotations.
   * Checks for both provides-api-from-url and provides-api-from-resource-ref annotations.
   * @param annotations The resource annotations
   * @param clusterName The cluster name
   * @param defaultNamespace The default namespace for resource refs
   * @returns The API definition result or null if no API annotations are present
   */
  async fetchApiFromAnnotations(
    annotations: Record<string, string>,
    clusterName: string,
    defaultNamespace: string,
  ): Promise<ApiDefinitionResult | null> {
    const prefix = this.getAnnotationPrefix();
    
    // Check for direct URL annotation first
    const urlAnnotation = annotations[`${prefix}/provides-api-from-url`];
    if (urlAnnotation) {
      return this.fetchFromUrl(urlAnnotation);
    }

    // Check for resource ref annotation
    const resourceRefAnnotation = annotations[`${prefix}/provides-api-from-resource-ref`];
    if (resourceRefAnnotation) {
      const resourceRef = this.parseResourceRefAnnotation(resourceRefAnnotation);
      if (resourceRef) {
        return this.fetchFromResourceRef(resourceRef, clusterName, defaultNamespace);
      }
      return {
        success: false,
        error: 'Invalid provides-api-from-resource-ref annotation format',
      };
    }

    // No API annotations present
    return null;
  }
}
