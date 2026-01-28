export interface KubernetesProxyRequestBody {
  path: string;
}

export interface KubernetesResourceFetcherOptions {
  clusterName: string;
  namespace?: string;
  resourcePath: string;
  query?: Record<string, string>;
}

export interface KubernetesResourceFetcher {
  getClusters(): Promise<string[]>;
  fetchResources<T>(options: KubernetesResourceFetcherOptions): Promise<T[]>;
  fetchResource<T>(options: KubernetesResourceFetcherOptions): Promise<T>;
  proxyKubernetesRequest(
    clusterName: string,
    request: KubernetesProxyRequestBody,
  ): Promise<any>;
}

/**
 * Configuration for fetching an API definition from a Kubernetes resource reference.
 * Used with the provides-api-from-resource-ref annotation.
 */
export interface ApiFromResourceRef {
  /** The kind of the Kubernetes resource (e.g., "Service", "Ingress") */
  kind: string;
  /** The name of the Kubernetes resource */
  name: string;
  /** The API version of the resource (e.g., "v1", "networking.k8s.io/v1") */
  apiVersion: string;
  /** Optional namespace of the resource (defaults to the source resource's namespace) */
  namespace?: string;
  /** The path to append to construct the API definition URL (e.g., "/swagger/openapi.json") */
  path: string;
  /** The protocol to use (http or https) */
  'target-protocol': 'http' | 'https';
  /** The port to use for the request */
  'target-port': string;
  /** JSONPath-like expression to extract the endpoint from the resource (e.g., ".status.loadBalancer.ingress[0].ip") */
  'target-field': string;
}

/**
 * Result of fetching an API definition
 */
export interface ApiDefinitionResult {
  /** Whether the fetch was successful */
  success: boolean;
  /** The API definition content in YAML format (if successful) */
  definition?: string;
  /** Error message if the fetch failed */
  error?: string;
  /** The URL from which the API definition was fetched (used for fixing servers field) */
  fetchUrl?: string;
}
