import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { EntityMeta } from '@backstage/catalog-model';

export interface PolicyReportSummary {
  error: number;
  fail: number;
  pass: number;
  skip: number;
  warn: number;
}

export interface PolicyReportResult {
  category: string;
  message: string;
  policy: string;
  result: string;
  rule: string;
  severity: string;
  source?: string;
  timestamp: {
    seconds: number;
  };
}

export interface PolicyReport {
  metadata: {
    uid: string;
    namespace: string;
  };
  scope: {
    kind: string;
    name: string;
  };
  summary: PolicyReportSummary;
  results?: PolicyReportResult[];
  clusterName: string;
}

export interface GetPolicyReportsRequest {
  entity: {
    metadata: EntityMeta;
  };
}

export interface GetPolicyReportsResponse {
  items: PolicyReport[];
}

export interface GetPolicyRequest {
  clusterName: string;
  namespace?: string;
  policyName: string;
  source?: string;
}

export interface GetPolicyResponse {
  policy: KubernetesObject;
}

export interface GetCrossplanePolicyReportsRequest {
  entity: {
    metadata: EntityMeta;
  };
}

export interface GetCrossplanePolicyReportsResponse {
  items: PolicyReport[];
}

// Returns true if the policy object is the deprecated kyverno.io/v1 Policy or ClusterPolicy kind.
export function isDeprecatedPolicy(policy: { kind?: string; apiVersion?: string }): boolean {
  return (
    (policy.kind === 'Policy' || policy.kind === 'ClusterPolicy') &&
    typeof policy.apiVersion === 'string' &&
    policy.apiVersion.startsWith('kyverno.io/')
  );
}

// Returns true when the PolicyReport result `source` field indicates a deprecated policy type.
export function isDeprecatedPolicySource(source: string | undefined): boolean {
  return source === 'kyverno';
}

export interface PolicyPathEntry {
  path: string;
}

// Maps a PolicyReport result `source` value to the specific API path(s) to try.
// Returns null when the source is unknown or not provided (caller uses full fallback order).
export function getPolicyPathsForSource(
  source: string,
  policyName: string,
  namespace?: string,
): PolicyPathEntry[] | null {
  switch (source) {
    case 'kyverno':
      return [
        { path: `/apis/kyverno.io/v1/clusterpolicies/${policyName}` },
        ...(namespace
          ? [{ path: `/apis/kyverno.io/v1/namespaces/${namespace}/policies/${policyName}` }]
          : []),
      ];
    case 'KyvernoValidatingPolicy':
      return [{ path: `/apis/policies.kyverno.io/v1/validatingpolicies/${policyName}` }];
    case 'KyvernoNamespacedValidatingPolicy':
      return namespace
        ? [{ path: `/apis/policies.kyverno.io/v1/namespaces/${namespace}/namespacedvalidatingpolicies/${policyName}` }]
        : null;
    case 'KyvernoMutatingPolicy':
      return [{ path: `/apis/policies.kyverno.io/v1/mutatingpolicies/${policyName}` }];
    case 'KyvernoNamespacedMutatingPolicy':
      return namespace
        ? [{ path: `/apis/policies.kyverno.io/v1/namespaces/${namespace}/namespacedmutatingpolicies/${policyName}` }]
        : null;
    case 'KyvernoDeletingPolicy':
      return [{ path: `/apis/policies.kyverno.io/v1/deletingpolicies/${policyName}` }];
    case 'KyvernoNamespacedDeletingPolicy':
      return namespace
        ? [{ path: `/apis/policies.kyverno.io/v1/namespaces/${namespace}/namespaceddeletingpolicies/${policyName}` }]
        : null;
    case 'KyvernoGeneratingPolicy':
      return [{ path: `/apis/policies.kyverno.io/v1/generatingpolicies/${policyName}` }];
    case 'KyvernoNamespacedGeneratingPolicy':
      return namespace
        ? [{ path: `/apis/policies.kyverno.io/v1/namespaces/${namespace}/namespacedgeneratingpolicies/${policyName}` }]
        : null;
    case 'KyvernoImageValidatingPolicy':
      return [{ path: `/apis/policies.kyverno.io/v1/imagevalidatingpolicies/${policyName}` }];
    case 'KyvernoNamespacedImageValidatingPolicy':
      return namespace
        ? [{ path: `/apis/policies.kyverno.io/v1/namespaces/${namespace}/namespacedimagevalidatingpolicies/${policyName}` }]
        : null;
    default:
      return null;
  }
}

// Ordered list of all policy API paths to try when source is unknown or source-based lookup failed.
// Tries deprecated types first (backward compatibility), then new policies.kyverno.io/v1 types.
export function getAllPolicyFallbackPaths(
  policyName: string,
  namespace?: string,
): PolicyPathEntry[] {
  const paths: PolicyPathEntry[] = [
    { path: `/apis/kyverno.io/v1/clusterpolicies/${policyName}` },
  ];
  if (namespace) {
    paths.push({ path: `/apis/kyverno.io/v1/namespaces/${namespace}/policies/${policyName}` });
  }
  paths.push(
    { path: `/apis/policies.kyverno.io/v1/deletingpolicies/${policyName}` },
    { path: `/apis/policies.kyverno.io/v1/generatingpolicies/${policyName}` },
    { path: `/apis/policies.kyverno.io/v1/imagevalidatingpolicies/${policyName}` },
    { path: `/apis/policies.kyverno.io/v1/mutatingpolicies/${policyName}` },
    { path: `/apis/policies.kyverno.io/v1/validatingpolicies/${policyName}` },
  );
  if (namespace) {
    paths.push(
      { path: `/apis/policies.kyverno.io/v1/namespaces/${namespace}/namespaceddeletingpolicies/${policyName}` },
      { path: `/apis/policies.kyverno.io/v1/namespaces/${namespace}/namespacedgeneratingpolicies/${policyName}` },
      { path: `/apis/policies.kyverno.io/v1/namespaces/${namespace}/namespacedimagevalidatingpolicies/${policyName}` },
      { path: `/apis/policies.kyverno.io/v1/namespaces/${namespace}/namespacedmutatingpolicies/${policyName}` },
      { path: `/apis/policies.kyverno.io/v1/namespaces/${namespace}/namespacedvalidatingpolicies/${policyName}` },
    );
  }
  return paths;
}
